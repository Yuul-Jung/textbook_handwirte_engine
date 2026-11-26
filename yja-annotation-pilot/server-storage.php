<?php
// v20: pilot-only, private per-user storage. No external URLs or client-selected user IDs.
if (!defined('ABSPATH')) { exit; }
final class YJA_Annotation_Storage {
    const NONCE = 'yja_annotation_v20';
    const MAX_BYTES = 8388608;
    const COURSE = 'amd-soc-rtl-pilot';
    const CHAPTER = 'part02-01';
    const REVISION = 'v15-fixture';
    const SCOPE = 'axi-led-pilot:v15-fixture';
    public static function table() { global $wpdb; return $wpdb->prefix . 'yja_annotation'; }
    public static function install() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::table(); $collate = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE $table (
user_id bigint(20) unsigned NOT NULL,
scope varchar(100) NOT NULL,
version bigint(20) unsigned NOT NULL,
payload longtext NOT NULL,
updated_at datetime NOT NULL,
PRIMARY KEY  (user_id,scope)
) $collate;");
    }
    public static function boot() {
        add_action('admin_post_yja_annotation_frame', array(__CLASS__, 'frame'));
        add_action('wp_ajax_yja_annotation_sync', array(__CLASS__, 'ajax'));
        add_action('wp_ajax_nopriv_yja_annotation_sync', array(__CLASS__, 'unauthenticated'));
        add_action('deleted_user', array(__CLASS__, 'purge_user'));
    }
    public static function authorized() { return get_current_user_id() > 0 && current_user_can('manage_options'); }
    private static function number($v) { return (is_int($v) || is_float($v)) && is_finite((float)$v); }
    private static function board_id($v) { return is_string($v) && ($v === '__yja_board__' || preg_match('/\A__yja_board__:[a-zA-Z0-9-]{1,80}\z/D', $v)); }
    private static function list_array($v) { return is_array($v) && ($v === array() || array_keys($v) === range(0,count($v)-1)); }
    // Validate and canonicalize only known fields; do not store arbitrary nested data.
    public static function validate($o) {
        if (!is_object($o) || ($o->schema??null)!==1 || ($o->course??null)!==self::COURSE || ($o->chapter??null)!==self::CHAPTER || ($o->revision??null)!==self::REVISION || !self::list_array($o->strokes??null) || count($o->strokes)>4000) return null;
        $boards=$o->boards??array((object)array('id'=>'__yja_board__','name'=>'백지 1'));
        if (!self::list_array($boards) || count($boards)<1 || count($boards)>20) return null;
        $valid=array(); $cleanBoards=array();
        foreach($boards as $b) {
            if (!is_object($b)||!self::board_id($b->id??null)||isset($valid[$b->id])||!is_string($b->name??null)||!trim($b->name)||strlen($b->name)>240||preg_match('/[\x00-\x1f\x7f]/',$b->name)) return null;
            // Match JS UTF-16 code-unit length without requiring mbstring.
            $chars=preg_match_all('/./us',$b->name); $extra=preg_match_all('/[\x{10000}-\x{10FFFF}]/u',$b->name); if($chars===false||$extra===false||$chars+$extra>60)return null;
            $valid[$b->id]=true; $cleanBoards[]=array('id'=>$b->id,'name'=>$b->name);
        }
        $active=$o->activeBoard??$cleanBoards[0]['id']; if(!is_string($active)||!isset($valid[$active]))return null;
        $anchors=array_fill_keys(array('intro','overview','io','diagram','code','accept','extra','__yja_page__'),true)+$valid;
        $ids=array(); $total=0; $clean=array();
        foreach($o->strokes as $s) {
            if(!is_object($s)||!is_string($s->id??null)||strlen($s->id)>100||isset($ids[$s->id])||!is_string($s->anchor??null)||!isset($anchors[$s->anchor])||!in_array($s->tool??null,array('pen','highlight','line','arrow','rect','circle'),true)||!in_array($s->color??null,array('#172033','#d72638','#1764d2','#16805c','#e7a000','#853ac5'),true)||!self::number($s->width??null)||$s->width<1||$s->width>12||!self::list_array($s->layout??null)||count($s->layout)<2||count($s->layout)>100||!self::list_array($s->points??null)||count($s->points)<1||count($s->points)>10000||($total+=count($s->points))>150000||(!in_array($s->tool,array('pen','highlight'),true)&&count($s->points)!==2))return null;
            foreach($s->layout as $v)if(!self::number($v))return null;
            foreach($s->points as $p){if(!self::list_array($p)||count($p)!==3)return null;foreach($p as $v)if(!self::number($v)||$v<0||$v>1)return null;}
            $ids[$s->id]=true; $clean[]=array('id'=>$s->id,'anchor'=>$s->anchor,'tool'=>$s->tool,'color'=>$s->color,'width'=>$s->width,'layout'=>$s->layout,'smooth'=>($s->smooth??false)===true,'points'=>$s->points);
        }
        return array('schema'=>1,'course'=>self::COURSE,'chapter'=>self::CHAPTER,'revision'=>self::REVISION,'boards'=>$cleanBoards,'activeBoard'=>$active,'strokes'=>$clean);
    }
    private static function response($status,$body){return array($status,$body);}
    // Caller identity comes only from authenticated WP session; never from request JSON.
    public static function handle($uid,$raw) {
        global $wpdb;
        if(!self::authorized() || $uid!==get_current_user_id())return self::response(403,array('error'=>'forbidden'));
        if(!is_string($raw)||strlen($raw)>self::MAX_BYTES)return self::response(413,array('error'=>'too_large'));
        $req=json_decode($raw,false,32); if(!is_object($req)||!in_array($req->op??null,array('load','save','delete'),true))return self::response(400,array('error'=>'invalid_request'));
        $table=self::table(); $scope=self::SCOPE;
        $read=function()use($wpdb,$table,$uid,$scope){return $wpdb->get_row($wpdb->prepare("SELECT version,payload FROM $table WHERE user_id=%d AND scope=%s",$uid,$scope),ARRAY_A);};
        if($req->op==='load'){
            $previous=$wpdb->suppress_errors(true); try{$row=$read();}finally{$wpdb->suppress_errors($previous);} if($wpdb->last_error)return self::response(503,array('error'=>'storage_unavailable'));
            if(!$row)return self::response(200,array('version'=>0,'payload'=>null));
            if($row['payload']==='null')return self::response(200,array('version'=>(int)$row['version'],'payload'=>null));
            $p=self::validate(json_decode($row['payload'],false,32)); if($p===null)return self::response(503,array('error'=>'stored_data_invalid'));
            return self::response(200,array('version'=>(int)$row['version'],'payload'=>$p));
        }
        $v=$req->version??null;
        if(!is_int($v)||$v<0||$v>=2147483647||($req->op==='delete'&&$v===0))return self::response(400,array('error'=>'invalid_version'));
        // Keep a versioned tombstone after deletion: an old tab cannot recreate erased ink.
        if($req->op==='delete'){$data='null';}
        else{$p=self::validate($req->payload??null);if($p===null)return self::response(400,array('error'=>'invalid_payload'));$data=wp_json_encode($p,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);} if(!is_string($data)||strlen($data)>self::MAX_BYTES)return self::response(413,array('error'=>'too_large'));
        // Atomic compare-and-swap: unique key for first save, conditional UPDATE for subsequent saves.
        // Suppress SQL error display; never return DB internals to client.
        $previous=$wpdb->suppress_errors(true);
        try {
            if($v===0)$changed=$wpdb->query($wpdb->prepare("INSERT INTO $table (user_id,scope,version,payload,updated_at) VALUES (%d,%s,1,%s,UTC_TIMESTAMP())",$uid,$scope,$data));
            else $changed=$wpdb->query($wpdb->prepare("UPDATE $table SET version=version+1,payload=%s,updated_at=UTC_TIMESTAMP() WHERE user_id=%d AND scope=%s AND version=%d",$data,$uid,$scope,$v));
            if($changed===1)return self::response(200,array('version'=>$v+1));
            $row=$read(); if($wpdb->last_error||!$row||(int)$row['version']===$v)return self::response(503,array('error'=>'storage_unavailable'));
            return self::response(409,array('error'=>'conflict','version'=>(int)$row['version']));
        } finally {$wpdb->suppress_errors($previous);}
    }
    // Endpoint guard is independently testable; WP nonce is tied to current user/session.
    public static function request_guard($server) {
        if(!self::authorized())return 403;
        if(!is_ssl())return 403;
        if(($server['REQUEST_METHOD']??'')!=='POST')return 405;
        $origin=$server['HTTP_ORIGIN']??'';
        if($origin!==''){
            $a=wp_parse_url(admin_url()); $b=wp_parse_url($origin);
            if(!is_array($a)||!is_array($b)||($a['scheme']??'')!=='https'||($b['scheme']??'')!=='https'||strtolower($a['host']??'')!==strtolower($b['host']??'')||($a['port']??443)!==($b['port']??443)||isset($b['user'])||isset($b['pass'])||isset($b['query'])||isset($b['fragment'])||isset($b['path']))return 403;
        }
        if(!wp_verify_nonce($server['HTTP_X_YJA_NONCE']??'',self::NONCE))return 403;
        if(strtolower(trim(explode(';',$server['CONTENT_TYPE']??'')[0]))!=='application/json')return 415;
        $len=$server['CONTENT_LENGTH']??'';
        if($len!==''&&(!ctype_digit((string)$len)||(float)$len>self::MAX_BYTES))return 413;
        return 200;
    }
    public static function private_headers(){nocache_headers();header('Cache-Control: private, no-store, max-age=0');header('X-Content-Type-Options: nosniff');}
    public static function unauthenticated(){self::private_headers();wp_send_json(array('error'=>'session_expired'),401);}
    public static function ajax() {
        self::private_headers();
        $status=self::request_guard($_SERVER);if($status!==200)wp_send_json(array('error'=>$status===403?'forbidden':'invalid_request'),$status);
        $raw=file_get_contents('php://input',false,null,0,self::MAX_BYTES+1);
        list($status,$body)=self::handle(get_current_user_id(),$raw); wp_send_json($body,$status);
    }
    // WordPress account deletion hook. Normal plugin uninstall deliberately preserves records.
    public static function purge_user($uid){
        global $wpdb;
        if(!is_int($uid)||$uid<=0)return false;
        $table=self::table();$previous=$wpdb->suppress_errors(true);
        try{return $wpdb->query($wpdb->prepare("DELETE FROM $table WHERE user_id=%d",$uid))!==false;}
        finally{$wpdb->suppress_errors($previous);}
    }
    public static function frame_url(){return admin_url('admin-post.php?action=yja_annotation_frame');}
    public static function frame() {
        if(!self::authorized()||!is_ssl())wp_die('관리자 권한이 필요합니다.','',array('response'=>403));
        self::private_headers(); header('Content-Type: text/html; charset=UTF-8'); header('X-Frame-Options: SAMEORIGIN'); header('Referrer-Policy: no-referrer');
        $html=file_get_contents(__DIR__.'/lesson/index.html');
        if(!is_string($html))wp_die('교재를 읽을 수 없습니다.');
        $config=wp_json_encode(array('endpoint'=>admin_url('admin-ajax.php?action=yja_annotation_sync'),'nonce'=>wp_create_nonce(self::NONCE)),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
        foreach(array('annotation.css','annotation-config.js','annotation.js') as $asset){$html=str_replace('"annotation/'.$asset.'"','"'.esc_url(plugins_url('lesson/annotation/'.$asset,__DIR__.'/yja-annotation-pilot.php')).'"',$html);}
        $scripts='<script type="application/json" id="yja-server-config">'.$config.'</script><script src="'.esc_url(plugins_url('lesson/annotation/server-sync.js',__DIR__.'/yja-annotation-pilot.php')).'" defer></script>';
        // config precedes the engine; sync script runs after DOMContentLoaded init registration.
        $html=str_replace('</body>',$scripts.'</body>',$html);
        echo str_replace('서버 전송 없음','관리자 개인 저장 시험 · 명시적 서버 저장',$html); exit;
    }
}

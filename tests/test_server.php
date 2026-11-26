<?php
// WP + SQL double, not a real MariaDB installation.
define('ABSPATH',__DIR__.'/');define('ARRAY_A','ARRAY_A');
$uid=1;$admin=true;$n=0;
function get_current_user_id(){return $GLOBALS['uid'];} function current_user_can($cap){return $GLOBALS['admin']&&$cap==='manage_options';}
function is_ssl(){return $GLOBALS['ssl']??true;} function wp_parse_url($s){return parse_url($s);} function admin_url(){return 'https://wp.example.test/wp-admin/';} function wp_verify_nonce($n,$action){return $n==='valid'&&$action===YJA_Annotation_Storage::NONCE;}
function wp_json_encode($o,$flags=0){return json_encode($o,$flags);}
class MockDB {
 public $prefix='wp_',$last_error='',$rows=[],$fail=false,$suppressed=false;
 function suppress_errors($v){$old=$this->suppressed;$this->suppressed=$v;return $old;}
 function prepare($sql,...$args){return [$sql,$args];}
 function get_row($q,$mode){$this->last_error=$this->fail?'mock failure':'';return $this->fail?null:($this->rows[$q[1][0].'|'.$q[1][1]]??null);}
 function query($q){$this->last_error='';if($this->fail){$this->last_error='mock failure';return false;}[$sql,$a]=$q;
  if(str_starts_with($sql,'INSERT')){[$u,$s,$data]=$a;$key="$u|$s";if(isset($this->rows[$key])){$this->last_error='duplicate';return false;}$this->rows[$key]=['version'=>1,'payload'=>$data];return 1;}
  if(str_starts_with($sql,'DELETE')){foreach(array_keys($this->rows) as $key)if(str_starts_with($key,$a[0].'|'))unset($this->rows[$key]);return 1;}
  [$data,$u,$s,$v]=$a;$key="$u|$s";if(($this->rows[$key]['version']??null)!==$v)return 0;$this->rows[$key]=['version'=>$v+1,'payload'=>$data];return 1;
 }
}
$wpdb=new MockDB();require __DIR__.'/../yja-annotation-pilot/server-storage.php';
function check($name,$ok){if(!$ok){fwrite(STDERR,"FAIL $name\n");exit(1);}echo "PASS $name\n";$GLOBALS['n']++;}
function payload(){return ['schema'=>1,'course'=>YJA_Annotation_Storage::COURSE,'chapter'=>YJA_Annotation_Storage::CHAPTER,'revision'=>YJA_Annotation_Storage::REVISION,'boards'=>[['id'=>'__yja_board__','name'=>'백지 1']],'activeBoard'=>'__yja_board__','strokes'=>[['id'=>'s1','anchor'=>'diagram','tool'=>'pen','color'=>'#d72638','width'=>3,'layout'=>[100,200,123,456],'smooth'=>true,'points'=>[[0.1,0.2,1],[0.3,0.4,0.5]]]]];}
function req($op,$v=0,$p=null,$extra=[]){global $uid;return YJA_Annotation_Storage::handle($uid,json_encode(array_merge(['op'=>$op,'version'=>$v,'payload'=>$p],$extra)));}
$p=payload();check('empty user record',req('load')===[200,['version'=>0,'payload'=>null]]);
check('initial save',req('save',0,$p)===[200,['version'=>1]]);
check('restore payload',req('load')[1]['payload']===$p);
check('stale initial insert conflict',req('save',0,$p)[0]===409);
$p2=$p;$p2['strokes'][0]['color']='#1764d2';check('conditional update',req('save',1,$p2)===[200,['version'=>2]]);
check('stale update rejected',req('save',1,$p)[0]===409);check('newer record preserved',req('load')[1]['payload']===$p2);
$uid=2;check('second user isolated',req('load')[1]['version']===0);check('client user_id ignored',req('save',0,$p,['user_id'=>1])[0]===200);check('second user own version',req('load')[1]['version']===1);
$uid=1;check('first user untouched',req('load')[1]['payload']===$p2);check('forged internal uid denied',YJA_Annotation_Storage::handle(2,'{"op":"load"}')[0]===403);
$admin=false;check('non-admin denied',req('load')[0]===403);$admin=true;$uid=0;check('guest denied',req('load')[0]===403);$uid=1;
foreach(['course','chapter','revision','schema'] as $k){$q=$p;$q[$k]='bad';check('wrong '.$k,req('save',2,$q)[0]===400);}
foreach(['anchor'=>'missing','color'=>'url(javascript:x)','tool'=>'script','width'=>99,'layout'=>[1,'2'],'points'=>[[1.1,0,1]],'id'=>str_repeat('x',101)] as $k=>$v){$q=$p;$q['strokes'][0][$k]=$v;check('bad stroke '.$k,req('save',2,$q)[0]===400);}
$q=$p;$q['strokes'][]=$q['strokes'][0];check('duplicate stroke id',req('save',2,$q)[0]===400);$q=$p;$q['activeBoard']='missing';check('invalid board active',req('save',2,$q)[0]===400);$q=$p;$q['boards'][0]['name']=str_repeat('😀',31);check('UTF16 name length',req('save',2,$q)[0]===400);
$q=$p;$q['strokes'][0]['tool']='line';$q['strokes'][0]['points'][]=[0,0,1];check('shape count',req('save',2,$q)[0]===400);
$q=$p;$q['strokes'][0]['points']=array_fill(0,10001,[0,0,1]);check('per stroke point bound',req('save',2,$q)[0]===400);
$q=$p;$q['strokes']=[];for($i=0;$i<16;$i++){$s=$p['strokes'][0];$s['id']='s'.$i;$s['points']=array_fill(0,10000,[0,0,1]);$q['strokes'][]=$s;}check('total point bound',req('save',2,$q)[0]===400);
check('oversize body',YJA_Annotation_Storage::handle(1,str_repeat('x',8388609))[0]===413);check('malformed JSON',YJA_Annotation_Storage::handle(1,'{')[0]===400);check('negative version',req('save',-1,$p)[0]===400);
$q=$p;$q['unknown']='<script>'; $q['strokes'][0]['unknown']='x';check('unknown fields stripped',YJA_Annotation_Storage::validate(json_decode(json_encode($q)))===$p);
$wpdb->fail=true;check('DB read failure',req('load')[0]===503);check('DB write failure',req('save',2,$p)[0]===503);$wpdb->fail=false;check('error suppression restored',!$wpdb->suppressed);
check('invalid input never overwrites',req('load')[1]['payload']===$p2);
$wpdb->rows['1|'.YJA_Annotation_Storage::SCOPE]['payload']='bad';check('corrupt stored row rejected',req('load')[0]===503);
$scope=YJA_Annotation_Storage::SCOPE;$wpdb->rows['1|'.$scope]['payload']=json_encode($p2);
check('delete stale version rejected',req('delete',1)[0]===409);
check('delete version zero rejected',req('delete',0)[0]===400);
check('delete uses monotonic version',req('delete',2)===[200,['version'=>3]]);
check('deleted record contains no ink',req('load')===[200,['version'=>3,'payload'=>null]]&&$wpdb->rows['1|'.$scope]['payload']==='null');
check('stale session cannot restore deleted record',req('save',2,$p)[0]===409);
check('stale first save cannot restore deleted record',req('save',0,$p)[0]===409);
check('new explicit save advances tombstone',req('save',3,$p)===[200,['version'=>4]]);
check('second user unchanged after deletion',json_decode($wpdb->rows['2|'.$scope]['payload'],true)===$p);
$g=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://wp.example.test','HTTP_X_YJA_NONCE'=>'valid','CONTENT_TYPE'=>'application/json; charset=UTF-8','CONTENT_LENGTH'=>'100'];
check('HTTPS same origin request accepted',YJA_Annotation_Storage::request_guard($g)===200);
foreach(['HTTP_ORIGIN'=>'https://evil.test','HTTP_X_YJA_NONCE'=>'expired','REQUEST_METHOD'=>'GET','CONTENT_TYPE'=>'text/plain','CONTENT_LENGTH'=>'8388609'] as $k=>$bad){$expected=['HTTP_ORIGIN'=>403,'HTTP_X_YJA_NONCE'=>403,'REQUEST_METHOD'=>405,'CONTENT_TYPE'=>415,'CONTENT_LENGTH'=>413][$k];check('guard '.$k,YJA_Annotation_Storage::request_guard(array_replace($g,[$k=>$bad]))===$expected);}
foreach(['null','https://wp.example.test:444','https://wp.example.test.evil.test','https://wp.example.test/path','https://user@wp.example.test'] as $bad)check('reject origin '.$bad,YJA_Annotation_Storage::request_guard(array_replace($g,['HTTP_ORIGIN'=>$bad]))===403);
$ssl=false;check('insecure transport refused',YJA_Annotation_Storage::request_guard($g)===403);$ssl=true;
$admin=false;check('revoked capability refused',YJA_Annotation_Storage::request_guard($g)===403);$admin=true;
$uid=0;check('expired login refused',YJA_Annotation_Storage::request_guard($g)===403);$uid=1;
check('account deletion purges own rows',YJA_Annotation_Storage::purge_user(1)&&!isset($wpdb->rows['1|'.$scope])&&isset($wpdb->rows['2|'.$scope]));
$wpdb->fail=true;check('account purge DB failure reported',!YJA_Annotation_Storage::purge_user(2)&&isset($wpdb->rows['2|'.$scope]));$wpdb->fail=false;
$q=payload();$q['strokes'][0]['anchor']='__yja_page__';check('page anchor accepted by server validator',YJA_Annotation_Storage::validate(json_decode(json_encode($q)))!==null);
$q['strokes'][0]['anchor']='__yja_page__:fake';check('forged page anchor rejected',YJA_Annotation_Storage::validate(json_decode(json_encode($q)))===null);
$q=payload();$q['strokes'][0]['anchor']='__yja_page__';$q['strokes'][0]['layout']=[1640,2500,-26,2,498,680,1,3456789012,1234567890];$validated=YJA_Annotation_Storage::validate(json_decode(json_encode($q)));check('v26 band signature retained by server validator',$validated!==null&&json_decode(json_encode($validated),true)['strokes'][0]['layout']===$q['strokes'][0]['layout']);
echo "$n server checks passed (SQL/WP double).\n";

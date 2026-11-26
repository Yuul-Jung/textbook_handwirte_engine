<?php
// WordPress API 최소 모형: 실제 WP 실행을 대신하지 않는다.
define('ABSPATH', __DIR__);
$admin = true; $options = array(); $errors = array(); $hooks = array(); $shortcodes = array(); $n = 0;
function register_activation_hook($f,$cb){$GLOBALS['activation']=$cb;}
function nocache_headers(){}
function admin_url($s){return 'https://wp.example.test/wp-admin/'.$s;}
function get_current_user_id(){return $GLOBALS['admin']?1:0;}
function add_shortcode($tag,$cb){$GLOBALS['shortcodes'][$tag]=$cb;}
function add_action($tag,$cb){$GLOBALS['hooks'][$tag]=$cb;}
function current_user_can($cap){return $cap==='manage_options' && $GLOBALS['admin'];}
function wp_parse_url($s){return parse_url($s);}
function sanitize_text_field($s){return trim(preg_replace('/[\r\n\t ]+/',' ',strip_tags($s)));}
function get_option($k,$d=''){return $GLOBALS['options'][$k]??$d;}
function add_settings_error($a,$b,$c,$d){$GLOBALS['errors'][]=$c;}
function register_setting($g,$o,$a){$GLOBALS['registration']=array($g,$o,$a);}
function add_options_page(...$a){$GLOBALS['menu']=$a;}
function plugins_url($path,$file){return 'https://wp.example.test/wp-content/plugins/yja-annotation-pilot/'.$path;}
function shortcode_atts($defaults,$args,$tag){return array_replace($defaults,array_intersect_key($args,$defaults));}
function esc_html($s){return htmlspecialchars($s,ENT_QUOTES,'UTF-8');}
function esc_attr($s){return esc_html($s);}
function esc_textarea($s){return esc_html($s);}
function esc_url($s){return preg_match('~^https?://~',$s)?esc_attr($s):'';}
function settings_errors($o){}
function settings_fields($g){echo '<input type="hidden" name="option_page" value="'.esc_attr($g).'">';echo '<input type="hidden" name="_wpnonce" value="mock-nonce">';}
function submit_button($s){echo '<button type="submit">'.esc_html($s).'</button>';}
function wp_die($s){throw new RuntimeException($s);}
function delete_option($s){unset($GLOBALS['options'][$s]);}
function check($name,$ok){if(!$ok){fwrite(STDERR,"FAIL $name\n");exit(1);}echo 'PASS '.$name."\n";$GLOBALS['n']++;}
require __DIR__.'/../yja-annotation-pilot/yja-annotation-pilot.php';
$c='YJA_Annotation_Pilot';$o=$c::OPTION;$good='https://yuul-jung.github.io/amd_soc_rtl/part02_1/ch01_axi_led_v01.html';
check('shortcode registered',isset($shortcodes['yja_annotation']));check('admin hooks registered',isset($hooks['admin_menu'],$hooks['admin_init']));
call_user_func($hooks['admin_init']); call_user_func($hooks['admin_menu']);
check('settings API group and REST disabled',$registration[0]===$c::GROUP && $registration[2]['show_in_rest']===false);
check('menu capability',$menu[2]==='manage_options');
check('valid external address',$c::allowed_url($good));
foreach(['http://yuul-jung.github.io/a.html','https://evil.test/a.html','https://yuul-jung.github.io.evil.test/a.html','https://yuul-jung.github.io@evil.test/a.html','https://evil.test@yuul-jung.github.io/a.html','https://yuul-jung.github.io:443/a.html','https://yuul-jung.github.io/a/../b.html','https://yuul-jung.github.io/a/%2e%2e/b.html','https://yuul-jung.github.io/a.html?x=1','https://yuul-jung.github.io/a.html#x','javascript:alert(1)','//yuul-jung.github.io/a.html',"https://yuul-jung.github.io/a.html\n",'https://yuul-jung.github.io/a\\b.html','https://yuul-jung.github.io/a.png','https://yuul-jung.github.io//a.html'] as $bad)check('reject '.json_encode($bad),!$c::allowed_url($bad));
$line='axi | AXI LED & 제어 | '.$good;
check('valid registry',$c::parse_registry($line)['axi']['title']==='AXI LED & 제어');
foreach([$line."\n".$line,'axi-led-pilot | a | '.$good,'a | <script>x</script> | '.$good,'a | | '.$good,'a | a | https://evil.test/a.html','a | a | '.$good.' | extra',str_repeat('x',16001)] as $bad)check('reject invalid registry', $c::parse_registry($bad)===null);
$many=[];for($i=0;$i<21;$i++)$many[]="id$i | title | $good";
check('20 external rows accepted',count($c::parse_registry(implode("\n",array_slice($many,0,20))))===20);
check('21 external rows blocked',$c::parse_registry(implode("\n",$many))===null);
$options[$o]=$c::sanitize_registry($line);check('settings normalization',$options[$o]===$line);
check('invalid update retains old',$c::sanitize_registry('bad')===$line && count($errors)===1);
$admin=false;check('unauthorized update retains old',$c::sanitize_registry('')===$line);check('unauthorized shortcode empty',$c::shortcode([])==='');
try{$c::settings_page();check('admin screen denied',false);}catch(RuntimeException $e){check('admin screen denied',true);}
$admin=true;$local=$c::shortcode([]);$remote=$c::shortcode(['lesson'=>'axi']);
check('local static iframe',str_contains($local,'admin-post.php?action=yja_annotation_frame') && str_contains($local,'<iframe'));
check('remote registered iframe',str_contains($remote,esc_url($good)) && str_contains($remote,'AXI LED &amp; 제어'));
check('raw URL override ignored',!str_contains($c::shortcode(['src'=>'https://evil.test/a.html']),'evil.test'));
check('unknown id no iframe',!str_contains($c::shortcode(['lesson'=>'missing']),'<iframe'));
check('non-string id no iframe',!str_contains($c::shortcode(['lesson'=>[]]),'<iframe'));
check('height upper bound',str_contains($c::shortcode(['height'=>'9999']),'height="1200"'));
check('height lower bound',str_contains($c::shortcode(['height'=>'1']),'height="400"'));
check('height injection rejected',str_contains($c::shortcode(['height'=>'850" onload="alert(1)']),'height="850"') && !str_contains($c::shortcode(['height'=>'850" onload="alert(1)']),'onload'));
check('sandbox least permissions',str_contains($local,'sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"') && !str_contains($local,'allow-top-navigation'));
check('fallback link protected',str_contains($local,'rel="noopener noreferrer"') && str_contains($local,'target="_blank"'));
check('referrer minimized',str_contains($local,'referrerpolicy="no-referrer"'));
$options[$o]='a | a | https://evil.test/a.html';check('corrupt stored registry fails closed',count($c::lessons())===1);$options[$o]=$line;
ob_start();$c::settings_page();$screen=ob_get_clean();check('admin form Settings API fields',str_contains($screen,'name="_wpnonce"') && str_contains($screen,'action="options.php"'));
check('admin page shortcode list and preview',str_contains($screen,'[yja_annotation lesson=&quot;axi&quot;') && str_contains($screen,'<iframe'));
file_put_contents(__DIR__.'/admin_fixture.html','<!doctype html><html lang="ko"><meta charset="utf-8"><title>WordPress mock</title><style>body{font:16px system-ui;background:#f0f0f1;margin:24px}.wrap{max-width:1600px;margin:auto}textarea{width:100%;box-sizing:border-box}table{border-collapse:collapse;width:100%;background:white}td,th{padding:10px;text-align:left;border-bottom:1px solid #ddd}button{padding:8px 16px;background:#2271b1;color:white;border:0}</style>'.$screen.'</html>');
file_put_contents(__DIR__.'/shortcode_fixture.html',$local);
define('WP_UNINSTALL_PLUGIN',true);require __DIR__.'/../yja-annotation-pilot/uninstall.php';check('uninstall removes registry only',!isset($options[$o]));
echo "$n checks passed (WP API mock).\n";

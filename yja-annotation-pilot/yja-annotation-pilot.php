<?php
/**
 * Plugin Name: YJA Annotation Pilot
 * Description: 독립 전자교재 판서 엔진의 관리자 전용 연동 시험. 쇼트코드 [yja_annotation].
 * Version: 0.30.0
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Author: YJA
 * Text Domain: yja-annotation-pilot
 */
if (!defined('ABSPATH')) { exit; }

require_once __DIR__ . '/server-storage.php';
register_activation_hook(__FILE__, array('YJA_Annotation_Storage', 'install'));
YJA_Annotation_Storage::boot();

final class YJA_Annotation_Pilot {
    const OPTION = 'yja_annotation_pilot_lessons';
    const GROUP = 'yja_annotation_pilot';
    const SLUG = 'yja-annotation-pilot';
    const HOST = 'yuul-jung.github.io';
    const LOCAL_ID = 'axi-led-pilot';

    public static function boot() {
        add_shortcode('yja_annotation', array(__CLASS__, 'shortcode'));
        add_action('admin_menu', array(__CLASS__, 'menu'));
        add_action('admin_init', array(__CLASS__, 'settings'));
    }

    // 외부 URL은 관리자 등록 + 정확한 HTTPS 호스트 + 정적 HTML 경로만 허용한다.
    // 서버가 원격 주소를 요청하지 않으며 리다이렉트의 최종 목적지는 검증하지 못한다.
    public static function allowed_url($url) {
        if (!is_string($url) || strlen($url) > 500) { return false; }
        if (!preg_match('~\Ahttps://yuul-jung\.github\.io/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.html\z~D', $url)) { return false; }
        $parts = wp_parse_url($url);
        return is_array($parts) && ($parts['scheme'] ?? '') === 'https' && ($parts['host'] ?? '') === self::HOST
            && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port']) && !isset($parts['query']) && !isset($parts['fragment']);
    }

    public static function parse_registry($raw) {
        if (!is_string($raw) || strlen($raw) > 16000) { return null; }
        $rows = array();
        foreach (preg_split('/\r\n|\r|\n/', $raw) as $line) {
            if (trim($line) === '') { continue; }
            $fields = array_map('trim', explode('|', $line));
            if (count($fields) !== 3 || count($rows) >= 20) { return null; }
            list($id, $title, $url) = $fields;
            if (!preg_match('/\A[a-z0-9][a-z0-9_-]{0,47}\z/D', $id) || $id === self::LOCAL_ID || isset($rows[$id])) { return null; }
            if ($title === '' || strlen($title) > 180 || sanitize_text_field($title) !== $title || !self::allowed_url($url)) { return null; }
            $rows[$id] = array('title' => $title, 'url' => $url);
        }
        return $rows;
    }

    // Settings API(options.php)가 관리자 권한과 nonce를 확인한다. 잘못된 등록은 전체 거부한다.
    public static function sanitize_registry($raw) {
        $rows = self::parse_registry($raw);
        if (!current_user_can('manage_options') || $rows === null) {
            add_settings_error(self::OPTION, 'invalid_registry', '등록 형식 또는 권한 오류: 기존 설정을 유지합니다.', 'error');
            $old = get_option(self::OPTION, '');
            return is_string($old) && self::parse_registry($old) !== null ? $old : '';
        }
        $lines = array();
        foreach ($rows as $id => $row) { $lines[] = $id . ' | ' . $row['title'] . ' | ' . $row['url']; }
        return implode("\n", $lines);
    }

    public static function settings() {
        register_setting(self::GROUP, self::OPTION, array('type' => 'string', 'default' => '', 'sanitize_callback' => array(__CLASS__, 'sanitize_registry'), 'show_in_rest' => false));
    }

    public static function menu() {
        add_options_page('전자교재 판서 시험', '전자교재 판서 시험', 'manage_options', self::SLUG, array(__CLASS__, 'settings_page'));
    }

    public static function lessons() {
        $rows = self::parse_registry(get_option(self::OPTION, ''));
        // 손상된 DB 설정을 읽을 때도 외부 URL을 다시 검사하고 실패 시 기본 교재만 노출한다.
        return array(self::LOCAL_ID => array('title' => 'AXI LED IP · 판서 시험', 'url' => YJA_Annotation_Storage::frame_url())) + ($rows ?? array());
    }

    public static function shortcode($atts = array()) {
        // 운영 사용자/수강생 권한 연동은 후속 단계. 현재는 관리자만 삽입 프레임을 받는다.
        if (!YJA_Annotation_Storage::authorized()) { return ''; }
        // Cache plugins must also exclude the protected frame/API and trial lesson.
        if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
        if (!headers_sent()) nocache_headers();
        $args = shortcode_atts(array('lesson' => self::LOCAL_ID, 'height' => '850'), is_array($atts) ? $atts : array(), 'yja_annotation');
        $lessons = self::lessons();
        $id = $args['lesson'];
        if (!is_string($id) || !isset($lessons[$id])) { return '<p>등록되지 않은 판서 시험 교재입니다.</p>'; }
        $row = $lessons[$id];
        $height = is_scalar($args['height']) && preg_match('/\A[0-9]{1,4}\z/D', (string) $args['height']) ? max(400, min(1200, (int) $args['height'])) : 850;
        $url = esc_url($row['url']);
        if ($url === '') { return '<p>교재 주소를 사용할 수 없습니다.</p>'; }
        // 스크립트 + 동일 출처는 저장소 호환을 위해 허용. 신뢰된 콘텐츠만 등록한다.
        // 외부 프레임의 로딩 성공을 부모가 단정할 수 없어 새 탭 링크를 항상 제공한다.
        return '<div class="yja-pilot-embed" style="width:100%;max-width:100%;margin:1em 0">'
            . '<p style="margin:0 0 .5em">' . esc_html($row['title']) . ' · 관리자 시험용 · '
            . '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">새 탭에서 열기</a></p>'
            . '<iframe title="' . esc_attr($row['title']) . '" src="' . $url . '" width="100%" height="' . $height . '" '
            . 'style="display:block;width:100%;max-width:100%;border:1px solid #d8d9d6;border-radius:6px" '
            . 'sandbox="allow-scripts allow-same-origin allow-downloads allow-modals" referrerpolicy="no-referrer"></iframe>'
            . '<p style="font-size:.85em">프레임 제한이나 저장 오류가 있으면 새 탭에서 시험하고 JSON 백업을 보관하세요. 기본 교재는 명시적 서버 저장을 지원하며 외부 교재는 로컬 저장만 지원합니다.</p></div>';
    }

    public static function settings_page() {
        if (!current_user_can('manage_options')) { wp_die('관리자 권한이 필요합니다.'); }
        $raw = get_option(self::OPTION, '');
        echo '<div class="wrap"><h1>전자교재 판서 시험 v30</h1><p>관리자 전용 독립 시험입니다. 기본 교재의 관리자별 서버 저장을 시험합니다. 실제 수강생 권한은 연동하지 않습니다.</p>';
        settings_errors(self::OPTION);
        echo '<form method="post" action="options.php">'; settings_fields(self::GROUP);
        echo '<h2>외부 교재 등록 (선택)</h2><label for="yja-registry">한 줄에 ID | 제목 | HTTPS 주소 · 최대 20개</label>';
        echo '<p>허용 출처: <code>https://' . esc_html(self::HOST) . '/</code> 정적 HTML. 외부 교재에는 판서 엔진이 사전에 설치되어 있어야 합니다.</p>';
        echo '<textarea id="yja-registry" name="' . esc_attr(self::OPTION) . '" rows="6" class="large-text code" maxlength="16000">' . esc_textarea(is_string($raw) ? $raw : '') . '</textarea>';
        submit_button('교재 등록 저장'); echo '</form><h2>쇼트코드</h2><table class="widefat striped"><thead><tr><th>교재</th><th>삽입 코드</th></tr></thead><tbody>';
        foreach (self::lessons() as $id => $row) {
            echo '<tr><td>' . esc_html($row['title']) . '</td><td><code>' . esc_html('[yja_annotation lesson="' . $id . '" height="850"]') . '</code></td></tr>';
        }
        echo '</tbody></table><h2>기본 교재 미리보기</h2>' . self::shortcode(array()) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- shortcode escapes all dynamic fields.
    }
}
YJA_Annotation_Pilot::boot();

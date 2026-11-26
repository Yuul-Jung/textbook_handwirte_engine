<?php
// Preserve private user records on uninstall. Administrator must explicitly delete the DB table after backup if desired.
if (!defined('WP_UNINSTALL_PLUGIN')) { exit; }
delete_option('yja_annotation_pilot_lessons');

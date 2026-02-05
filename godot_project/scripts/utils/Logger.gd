class_name Logger
extends RefCounted

enum Level {
	SILENT = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
	TRACE = 5
}

var _level: Level = Level.WARN
var _category_levels: Dictionary = {}

func configure(level: Level, categories: Dictionary = {}) -> void:
	_level = level
	_category_levels = categories

func _should_log(level: Level, category: String) -> bool:
	var effective = _category_levels.get(category, _level) as Level
	return level <= effective

func error(category: String, message: String) -> void:
	if _should_log(Level.ERROR, category):
		push_error("[%s:error] %s" % [category, message])

func warn(category: String, message: String) -> void:
	if _should_log(Level.WARN, category):
		push_warning("[%s:warn] %s" % [category, message])

func info(category: String, message: String) -> void:
	if _should_log(Level.INFO, category):
		print("[%s:info] %s" % [category, message])

func debug(category: String, message: String) -> void:
	if _should_log(Level.DEBUG, category):
		print("[%s:debug] %s" % [category, message])

func trace(category: String, message: String) -> void:
	if _should_log(Level.TRACE, category):
		print("[%s:trace] %s" % [category, message])

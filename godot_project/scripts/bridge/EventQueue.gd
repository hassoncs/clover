class_name EventQueue
extends RefCounted

const MAX_EVENT_QUEUE_SIZE: int = 100

var _event_queue: Array = []

func queue_event(event_type: String, data: Dictionary) -> void:
	var event = {"type": event_type, "data": data}
	_event_queue.append(event)
	if _event_queue.size() > MAX_EVENT_QUEUE_SIZE:
		_event_queue.pop_front()

func poll_events() -> String:
	if _event_queue.is_empty():
		return "[]"
	var events = _event_queue.duplicate()
	_event_queue.clear()
	return JSON.stringify(events)

func clear() -> void:
	_event_queue.clear()

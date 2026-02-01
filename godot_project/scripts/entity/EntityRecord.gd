class_name EntityRecord extends RefCounted

var entity_id: String
var node: Node2D
var archetype: String
var template: String
var tags: Array[String]
var group: String
var user_data: Dictionary
var velocity: Vector2 = Vector2.ZERO
var texture_ref: String = ""
var audio_refs: Array[String] = []

func is_valid() -> bool:
    return node != null and is_instance_valid(node)

func _init(id: String, n: Node2D, arch: String):
    entity_id = id
    node = n
    archetype = arch
    tags = []
    user_data = {}
    audio_refs = []
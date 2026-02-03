class_name EntityUtils
extends RefCounted

## Entity validation and retrieval utilities.
##
## Usage:
##   var node = EntityUtils.get_valid_entity(entities_dict, entity_id)
##   if node:
##       # do something with node

static func get_valid_entity(entities: Dictionary, entity_id: String) -> Node:
	"""
	Get an entity by ID if it exists and is valid.

	Args:
		entities: Dictionary mapping entity_id -> Node
		entity_id: ID of the entity to retrieve

	Returns:
		The entity Node if found and valid, null otherwise
	"""
	if not entities.has(entity_id):
		return null
	var node = entities[entity_id]
	if is_instance_valid(node):
		return node
	return null


static func has_valid_entity(entities: Dictionary, entity_id: String) -> bool:
	"""Check if an entity exists and is valid."""
	return get_valid_entity(entities, entity_id) != null


static func find_sprite_in_entity(node: Node) -> CanvasItem:
	"""
	Recursively find a Sprite2D or AnimatedSprite2D in an entity node tree.

	Args:
		node: Root node to search from

	Returns:
		The first Sprite2D or AnimatedSprite2D found, or null
	"""
	if node is Sprite2D or node is AnimatedSprite2D:
		return node
	for child in node.get_children():
		if child is Sprite2D or child is AnimatedSprite2D:
			return child
		var found = find_sprite_in_entity(child)
		if found:
			return found
	return null


static func find_physics_body(node: Node) -> Node:
	"""
	Find a RigidBody2D or CharacterBody2D in an entity node tree.

	Args:
		node: Root node to search from

	Returns:
		The first physics body found, or null
	"""
	if node is RigidBody2D or node is CharacterBody2D:
		return node
	for child in node.get_children():
		if child is RigidBody2D or child is CharacterBody2D:
			return child
		var found = find_physics_body(child)
		if found:
			return found
	return null

extends RigidBody2D

func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	if state.get_contact_count() > 0:
		var bridge = get_node("/root/GameBridge")
		if bridge and bridge._collision_system:
			bridge._collision_system._handle_collision_manifold(self, state, bridge.entity_registry)

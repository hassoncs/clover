extends RigidBody2D

func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	if state.get_contact_count() > 0:
		var bridge = get_node("/root/GameBridge")
		if bridge:
			bridge._handle_collision_manifold(self, state)

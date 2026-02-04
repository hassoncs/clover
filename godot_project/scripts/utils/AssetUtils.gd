class_name AssetUtils
extends RefCounted

static func resolve_url(data: Dictionary, bridge: Node = null) -> String:
	# V3: Check for pre-constructed URL first
	var url = data.get("url", "")
	if url != "":
		return url
	
	# V3: Use r2Key to construct URL
	var r2_key = data.get("r2Key", data.get("assetRef", ""))
	if r2_key != "":
		return get_asset_url(r2_key, bridge)
		
	return ""


static func get_asset_url(asset_ref: String, bridge: Node = null) -> String:
	# Check if it's already a full URL
	if asset_ref.begins_with("http://") or asset_ref.begins_with("https://") or asset_ref.begins_with("res://"):
		return asset_ref
		
	var cdn_base = "https://cdn.slopcade.com"
	if bridge and "game_data" in bridge:
		cdn_base = bridge.game_data.get("cdnBaseUrl", cdn_base)
		
	return cdn_base.trim_suffix("/") + "/" + asset_ref

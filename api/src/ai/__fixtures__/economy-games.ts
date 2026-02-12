import type { EconomyGraph } from "@slopcade/economy-engine";

export const simpleResourceEconomy: EconomyGraph = {
	id: "simple-resources",
	resourceTypes: ["coins", "gems"],
	nodes: [
		{
			id: "coin-source",
			type: "source",
			label: "Coin Generator",
			resourceType: "coins",
		},
		{
			id: "coin-pool",
			type: "pool",
			label: "Coin Wallet",
			resourceType: "coins",
			initialValue: 0,
			capacity: 1000,
		},
		{
			id: "gem-source",
			type: "source",
			label: "Gem Mine",
			resourceType: "gems",
		},
		{
			id: "gem-pool",
			type: "pool",
			label: "Gem Vault",
			resourceType: "gems",
			initialValue: 0,
			capacity: 100,
		},
	],
	edges: [
		{
			id: "e1",
			type: "resource",
			from: "coin-source",
			to: "coin-pool",
			formula: "10",
		},
		{
			id: "e2",
			type: "resource",
			from: "gem-source",
			to: "gem-pool",
			formula: "1",
		},
	],
};

export const craftingEconomy: EconomyGraph = {
	id: "crafting-system",
	resourceTypes: ["wood", "stone", "tools"],
	nodes: [
		{
			id: "wood-source",
			type: "source",
			label: "Forest",
			resourceType: "wood",
		},
		{
			id: "stone-source",
			type: "source",
			label: "Quarry",
			resourceType: "stone",
		},
		{
			id: "wood-pool",
			type: "pool",
			label: "Wood Storage",
			resourceType: "wood",
			initialValue: 50,
			capacity: 200,
		},
		{
			id: "stone-pool",
			type: "pool",
			label: "Stone Storage",
			resourceType: "stone",
			initialValue: 30,
			capacity: 200,
		},
		{
			id: "tools-pool",
			type: "pool",
			label: "Tool Inventory",
			resourceType: "tools",
			initialValue: 0,
			capacity: 50,
		},
		{
			id: "craft-converter",
			type: "converter",
			label: "Crafting Station",
			inputResourceType: "wood",
			outputResourceType: "tools",
			rate: 1,
		},
	],
	edges: [
		{
			id: "e1",
			type: "resource",
			from: "wood-source",
			to: "wood-pool",
			formula: "5",
		},
		{
			id: "e2",
			type: "resource",
			from: "stone-source",
			to: "stone-pool",
			formula: "3",
		},
		{
			id: "e3",
			type: "resource",
			from: "wood-pool",
			to: "craft-converter",
			formula: "10",
		},
		{
			id: "e4",
			type: "resource",
			from: "craft-converter",
			to: "tools-pool",
			formula: "1",
		},
	],
};

export const gamblingEconomy: EconomyGraph = {
	id: "gambling-system",
	resourceTypes: ["chips"],
	nodes: [
		{
			id: "house-source",
			type: "source",
			label: "House Bank",
			resourceType: "chips",
		},
		{
			id: "player-pool",
			type: "pool",
			label: "Player Stack",
			resourceType: "chips",
			initialValue: 100,
			capacity: 10000,
		},
		{
			id: "luck-gate",
			type: "gate",
			label: "Luck Gate",
			resourceType: "chips",
			mode: "probabilistic",
		},
		{
			id: "win-pool",
			type: "pool",
			label: "Winnings",
			resourceType: "chips",
			initialValue: 0,
			capacity: 1000,
		},
		{
			id: "loss-drain",
			type: "drain",
			label: "Losses",
			resourceType: "chips",
		},
	],
	edges: [
		{
			id: "e1",
			type: "resource",
			from: "house-source",
			to: "luck-gate",
			formula: "50",
		},
		{
			id: "e2",
			type: "resource",
			from: "luck-gate",
			to: "win-pool",
			formula: "50",
			probability: 0.4,
		},
		{
			id: "e3",
			type: "resource",
			from: "luck-gate",
			to: "loss-drain",
			formula: "50",
			probability: 0.6,
		},
	],
};

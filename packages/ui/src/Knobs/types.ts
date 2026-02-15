export interface KnobBaseProps {
	label: string;
	description?: string;
}

export interface KnobSliderProps extends KnobBaseProps {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (value: number) => void;
}

export interface KnobToggleProps extends KnobBaseProps {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}

export interface KnobButtonProps {
	label: string;
	action: string;
	variant?: "default" | "destructive";
	onAction: (action: string) => void;
	disabled?: boolean;
}

export interface KnobColorProps extends KnobBaseProps {
	value: string;
	presets?: string[];
	onChange: (value: string) => void;
	disabled?: boolean;
}

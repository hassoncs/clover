import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";

const meta: Meta = {
	title: "Amen/Theme/Typography",
	tags: ["autodocs"],
};

export default meta;

function TypeSpecimen({
	label,
	fontFamily,
	fontSize,
	fontWeight,
	sample = "The quick brown fox jumps over the lazy dog",
}: {
	label: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: string;
	sample?: string;
}) {
	return (
		<View style={{ marginBottom: 24 }}>
			<Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
				{label} · {fontFamily} · {fontSize}px · {fontWeight}
			</Text>
			<Text
				style={{
					fontFamily,
					fontSize,
					fontWeight: fontWeight as any,
					color: "#373028",
				}}
			>
				{sample}
			</Text>
		</View>
	);
}

export const Typography: StoryObj = {
	render: () => (
		<View style={{ padding: 24 }}>
			<Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
				Amen Typography
			</Text>

			<View style={{ marginBottom: 32 }}>
				<Text
					style={{
						fontSize: 18,
						fontWeight: "bold",
						marginBottom: 16,
						color: "#1B3A6B",
					}}
				>
					Headings (Lora)
				</Text>
				<TypeSpecimen
					label="H1"
					fontFamily="Lora-Bold"
					fontSize={48}
					fontWeight="700"
					sample="Amen UI Kit"
				/>
				<TypeSpecimen
					label="H2"
					fontFamily="Lora-Bold"
					fontSize={36}
					fontWeight="700"
					sample="Sacred Geometry"
				/>
				<TypeSpecimen
					label="H3"
					fontFamily="Lora-Regular"
					fontSize={30}
					fontWeight="400"
					sample="Divine Proportions"
				/>
				<TypeSpecimen
					label="H4"
					fontFamily="Lora-Regular"
					fontSize={24}
					fontWeight="400"
					sample="Golden Ratio"
				/>
				<TypeSpecimen
					label="H5"
					fontFamily="Lora-Medium"
					fontSize={20}
					fontWeight="500"
					sample="Eternal Truths"
				/>
				<TypeSpecimen
					label="H6"
					fontFamily="Lora-Medium"
					fontSize={18}
					fontWeight="500"
					sample="Spiritual Guidance"
				/>
			</View>

			<View>
				<Text
					style={{
						fontSize: 18,
						fontWeight: "bold",
						marginBottom: 16,
						color: "#1B3A6B",
					}}
				>
					Body (Inter)
				</Text>
				<TypeSpecimen
					label="Body Large"
					fontFamily="Inter-Regular"
					fontSize={18}
					fontWeight="400"
				/>
				<TypeSpecimen
					label="Body Regular"
					fontFamily="Inter-Regular"
					fontSize={16}
					fontWeight="400"
				/>
				<TypeSpecimen
					label="Body Small"
					fontFamily="Inter-Regular"
					fontSize={14}
					fontWeight="400"
				/>
				<TypeSpecimen
					label="Caption"
					fontFamily="Inter-Regular"
					fontSize={12}
					fontWeight="400"
				/>
				<TypeSpecimen
					label="Button Text"
					fontFamily="Inter-SemiBold"
					fontSize={14}
					fontWeight="600"
					sample="CLICK ME"
				/>
			</View>
		</View>
	),
};

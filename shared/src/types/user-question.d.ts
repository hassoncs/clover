import { z } from 'zod';
export declare const QuestionOptionSchema: z.ZodObject<{
    label: z.ZodString;
    description: z.ZodString;
    iconKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label?: string;
    description?: string;
    iconKey?: string;
}, {
    label?: string;
    description?: string;
    iconKey?: string;
}>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export declare const UserQuestionSchema: z.ZodObject<{
    header: z.ZodString;
    question: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodString;
        iconKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label?: string;
        description?: string;
        iconKey?: string;
    }, {
        label?: string;
        description?: string;
        iconKey?: string;
    }>, "many">;
    multiple: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    options?: {
        label?: string;
        description?: string;
        iconKey?: string;
    }[];
    header?: string;
    question?: string;
    multiple?: boolean;
}, {
    options?: {
        label?: string;
        description?: string;
        iconKey?: string;
    }[];
    header?: string;
    question?: string;
    multiple?: boolean;
}>;
export type UserQuestion = z.infer<typeof UserQuestionSchema>;
export declare const AskUserInputSchema: z.ZodObject<{
    questions: z.ZodArray<z.ZodObject<{
        header: z.ZodString;
        question: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            description: z.ZodString;
            iconKey: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            label?: string;
            description?: string;
            iconKey?: string;
        }, {
            label?: string;
            description?: string;
            iconKey?: string;
        }>, "many">;
        multiple: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        options?: {
            label?: string;
            description?: string;
            iconKey?: string;
        }[];
        header?: string;
        question?: string;
        multiple?: boolean;
    }, {
        options?: {
            label?: string;
            description?: string;
            iconKey?: string;
        }[];
        header?: string;
        question?: string;
        multiple?: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    questions?: {
        options?: {
            label?: string;
            description?: string;
            iconKey?: string;
        }[];
        header?: string;
        question?: string;
        multiple?: boolean;
    }[];
}, {
    questions?: {
        options?: {
            label?: string;
            description?: string;
            iconKey?: string;
        }[];
        header?: string;
        question?: string;
        multiple?: boolean;
    }[];
}>;
export type AskUserInput = z.infer<typeof AskUserInputSchema>;
export declare const UserAnswerSchema: z.ZodObject<{
    answers: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    answers?: string[][];
}, {
    answers?: string[][];
}>;
export type UserAnswer = z.infer<typeof UserAnswerSchema>;
//# sourceMappingURL=user-question.d.ts.map
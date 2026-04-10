import { z } from 'zod';
export const QuestionOptionSchema = z.object({
    label: z.string().describe('The text to display for this option'),
    description: z.string().describe('A longer description of what this option means'),
    iconKey: z.string().optional().describe('Optional key for an icon to display next to the option'),
});
export const UserQuestionSchema = z.object({
    header: z.string().describe('A short, concise header for the question'),
    question: z.string().describe('The full question text to display to the user'),
    options: z.array(QuestionOptionSchema).describe('The list of options the user can choose from'),
    multiple: z.boolean().optional().describe('Whether the user can select multiple options'),
});
export const AskUserInputSchema = z.object({
    questions: z.array(UserQuestionSchema).describe('The list of questions to ask the user'),
});
export const UserAnswerSchema = z.object({
    answers: z.array(z.array(z.string())).describe('The user\'s answers, as an array of selected labels per question'),
});
//# sourceMappingURL=user-question.js.map
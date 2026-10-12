import {
  SparklesIcon,
  PencilEdit01Icon,
  Globe02Icon,
  CodeIcon,
  BulbIcon,
  Search01Icon,
  Mail01Icon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type PromptCategory = "all" | "write" | "research" | "code" | "ideas";

export const promptCategories: { id: PromptCategory; label: string; icon: IconSvgElement }[] = [
  { id: "all", label: "For you", icon: SparklesIcon },
  { id: "write", label: "Writing", icon: PencilEdit01Icon },
  { id: "research", label: "Research", icon: Globe02Icon },
  { id: "code", label: "Coding", icon: CodeIcon },
  { id: "ideas", label: "Everyday", icon: BulbIcon },
];

export const prompts: {
  title: string;
  description: string;
  prompt: string;
  category: PromptCategory;
  icon: IconSvgElement;
  webSearch?: boolean;
}[] = [
  {
    title: "Get a clearer picture",
    description: "Research a question, compare perspectives, and find sources worth reading.",
    prompt:
      "Research this topic using reliable sources. Compare the main perspectives and explain what the evidence supports: ",
    category: "research",
    icon: Globe02Icon,
    webSearch: true,
  },
  {
    title: "Make the first draft easier",
    description: "Find the words for an email, a story, or the idea you keep coming back to.",
    prompt:
      "Help me write a clear first draft. Here is my audience, the tone I want, and what I need to say: ",
    category: "write",
    icon: PencilEdit01Icon,
  },
  {
    title: "Understand the tricky part",
    description: "Start with a simple example, then work your way into the details.",
    prompt: "Explain this concept with a practical example, then build up to the details: ",
    category: "ideas",
    icon: BulbIcon,
  },
  {
    title: "A second look at your code",
    description: "Spot bugs, improve readability, and understand the changes.",
    prompt:
      "Review this code for bugs, readability, and security. Explain the most useful changes:\n\n",
    category: "code",
    icon: CodeIcon,
  },
  {
    title: "An email, well said",
    description: "A thoughtful message with the right tone and a clear next step.",
    prompt:
      "Draft an email from the following notes. Keep it clear and professional, and end with an appropriate next step:\n\n",
    category: "write",
    icon: Mail01Icon,
  },
  {
    title: "Compare before you choose",
    description: "Look at the tradeoffs and get the context behind each option.",
    prompt:
      "Research and compare these options. Include sources, important differences, strengths, and limitations: ",
    category: "research",
    icon: Search01Icon,
    webSearch: true,
  },
  {
    title: "Turn a goal into a plan",
    description: "Break a big idea into realistic steps you can start today.",
    prompt:
      "Break this goal into practical next steps. Here is the goal, my timeline, and my constraints: ",
    category: "ideas",
    icon: BookOpen01Icon,
  },
  {
    title: "Learn by building",
    description: "Connect a programming concept to a small working example.",
    prompt:
      "Teach me this programming concept through a small example project. Explain each step and include an exercise: ",
    category: "code",
    icon: CodeIcon,
  },
];

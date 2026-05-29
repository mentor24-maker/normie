import type {
  GameReminder,
  GameReminderCriterionValue,
  GameReminderNumericCriterion,
  GameReminderOperator,
  GameReminderPollCriterion,
  GameReminderRegisteredCriterion
} from "@/lib/game-reminder";
import { formatReminderCriterionSummary, reminderOperatorLabel } from "@/lib/game-reminder";

export type PlayerReminderContext = {
  pollsTaken: number;
  loginCount: number;
  answeredPollIds: ReadonlySet<string>;
  isRegistered: boolean;
};

export type PlayerMatchedReminder = Pick<GameReminder, "id" | "name" | "displayType" | "messageHtml">;

export type ReminderMatchExplanation = {
  matched: boolean;
  reason: string;
};

function describeNumericComparison(
  subject: string,
  actual: number,
  operator: GameReminderOperator,
  target: number
): ReminderMatchExplanation {
  const matched = compareNumeric(actual, operator, target);
  const operatorLabel = reminderOperatorLabel(operator).toLowerCase();

  return {
    matched,
    reason: matched
      ? `${subject} is ${actual}; matches ${operatorLabel} ${target}.`
      : `${subject} is ${actual}; needs ${operatorLabel} ${target}.`
  };
}

function compareNumeric(actual: number, operator: GameReminderOperator, target: number): boolean {
  if (operator === "eq") {
    return actual === target;
  }

  if (operator === "lte") {
    return actual <= target;
  }

  return actual >= target;
}

function asNumericCriterion(value: GameReminderCriterionValue): GameReminderNumericCriterion {
  if ("operator" in value && "count" in value) {
    return value;
  }

  return { operator: "gte", count: 1 };
}

function asPollCriterion(value: GameReminderCriterionValue): GameReminderPollCriterion {
  if ("pollId" in value) {
    return value;
  }

  return { pollId: "" };
}

function asRegisteredCriterion(value: GameReminderCriterionValue): GameReminderRegisteredCriterion {
  if ("registered" in value) {
    return value;
  }

  return { registered: false };
}

export function explainReminderMatch(reminder: GameReminder, context: PlayerReminderContext): ReminderMatchExplanation {
  if (!reminder.isActive) {
    return { matched: false, reason: "Reminder is inactive." };
  }

  switch (reminder.criterionType) {
    case "polls_taken": {
      const criterion = asNumericCriterion(reminder.criterionValue);
      return describeNumericComparison("Polls taken", context.pollsTaken, criterion.operator, criterion.count);
    }
    case "logins": {
      const criterion = asNumericCriterion(reminder.criterionValue);
      return describeNumericComparison("Logins", context.loginCount, criterion.operator, criterion.count);
    }
    case "specific_poll": {
      const criterion = asPollCriterion(reminder.criterionValue);

      if (!criterion.pollId) {
        return { matched: false, reason: "Reminder is missing a poll selection." };
      }

      const matched = context.answeredPollIds.has(criterion.pollId);
      return {
        matched,
        reason: matched
          ? `Player answered poll ${criterion.pollId}.`
          : `Player has not answered poll ${criterion.pollId}.`
      };
    }
    case "registered": {
      const criterion = asRegisteredCriterion(reminder.criterionValue);
      const matched = context.isRegistered === criterion.registered;
      return {
        matched,
        reason: matched
          ? `Registered status is ${context.isRegistered ? "yes" : "no"} as required.`
          : `Registered status is ${context.isRegistered ? "yes" : "no"}; reminder requires ${criterion.registered ? "yes" : "no"}.`
      };
    }
    default:
      return { matched: false, reason: "Unknown reminder criterion type." };
  }
}

export function reminderMatchesContext(reminder: GameReminder, context: PlayerReminderContext): boolean {
  return explainReminderMatch(reminder, context).matched;
}

export function evaluatePlayerReminders(
  reminders: GameReminder[],
  context: PlayerReminderContext
): PlayerMatchedReminder[] {
  return reminders
    .filter((reminder) => reminderMatchesContext(reminder, context))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    )
    .map((reminder) => ({
      id: reminder.id,
      name: reminder.name,
      displayType: reminder.displayType,
      messageHtml: reminder.messageHtml
    }));
}

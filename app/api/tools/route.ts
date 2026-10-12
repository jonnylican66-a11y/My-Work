import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

type Reminder = {
  id: string;
  title: string;
  dueDate: string;
  createdAt: string;
};

const REMINDERS_FILE = join(process.cwd(), "data", "reminders.json");

async function ensureDataDir() {
  const dir = join(process.cwd(), "data");
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function loadReminders(): Promise<Reminder[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(REMINDERS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, title, dueDate } = body;

    if (action === "list") {
      const reminders = await loadReminders();
      return NextResponse.json({ reminders });
    }

    if (action === "create") {
      if (!title || !dueDate) {
        return NextResponse.json(
          { error: "title and dueDate are required" },
          { status: 400 }
        );
      }

      const titleStr = String(title).slice(0, 200).trim();
      const dueDateStr = String(dueDate);
      if (!/^\d{4}-\d{2}-\d{2}/.test(dueDateStr)) {
        return NextResponse.json(
          { error: "dueDate must be ISO format (YYYY-MM-DD...)" },
          { status: 400 }
        );
      }

      const reminders = await loadReminders();
      const newReminder: Reminder = {
        id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: titleStr,
        dueDate: dueDateStr,
        createdAt: new Date().toISOString()
      };
      reminders.push(newReminder);
      await saveReminders(reminders);

      return NextResponse.json({ reminder: newReminder });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }

      const reminders = await loadReminders();
      const filtered = reminders.filter((r) => r.id !== id);

      if (filtered.length === reminders.length) {
        return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
      }

      await saveReminders(filtered);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

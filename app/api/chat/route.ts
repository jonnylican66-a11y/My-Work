import { NextRequest, NextResponse } from "next/server";

const maxInputChars = parseInt(process.env.CHAT_MAX_INPUT_CHARS || "12000", 10);

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userMessage = String(body.message || "").trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (userMessage.length > maxInputChars) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${maxInputChars} characters` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "API is not configured. Set OPENAI_API_KEY in .env.local" },
        { status: 503 }
      );
    }

    const messages: Message[] = [
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response received";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const dir = path.join(process.cwd(), 'data', 'results');
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${(data.name || 'anon').replace(/\W/g, '')}.json`;
    await writeFile(path.join(dir, filename), JSON.stringify(data, null, 2));
    return NextResponse.json({ ok: true, id: filename });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

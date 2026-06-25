import { getDbConnection } from "./db";

export async function getSummaries(userId:string){
    const sql = await getDbConnection();
    const summaries = await sql`SELECT * from pdf_summaries where user_id = ${userId} ORDER BY created_at DESC`
    return summaries;
}

export async function getSummaryById(id: string, userId: string) {
    const sql = await getDbConnection();
    const summaries = await sql`
        SELECT *
        FROM pdf_summaries
        WHERE id = ${id} AND user_id = ${userId}
        LIMIT 1
    `;

    return summaries[0] ?? null;
}

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../_core/db";
import { inquiries, solarApplications, user } from "../db/schema";

export type SolarApplicationInput = {
  applicantName: string;
  phone: string;
  email: string;
  postalCode?: string;
  address: string;
  buildingType: string;
  balconyDirection: string;
  balconyWidth?: string;
  monthlyBill?: number;
  packageId?: string;
  packageName?: string;
  quantity?: number;
  visitPreference?: string;
  note?: string;
  privacyAgreed: boolean;
};

export type SolarStatus = "received" | "reviewing" | "surveying" | "quoted" | "closed";

export async function createSolarApplication(userId: string, input: SolarApplicationInput) {
  const now = new Date().toISOString();
  const [created] = await getDb()
    .insert(solarApplications)
    .values({
      userId,
      applicantName: input.applicantName,
      phone: input.phone,
      email: input.email,
      postalCode: input.postalCode ?? "",
      address: input.address,
      buildingType: input.buildingType,
      balconyDirection: input.balconyDirection,
      balconyWidth: input.balconyWidth ?? "",
      monthlyBill: input.monthlyBill ?? 0,
      packageId: input.packageId ?? "",
      packageName: input.packageName ?? "",
      quantity: input.quantity ?? 1,
      visitPreference: input.visitPreference ?? "",
      note: input.note ?? "",
      privacyAgreed: input.privacyAgreed,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return created;
}

export async function listMySolarApplications(userId: string) {
  return getDb()
    .select()
    .from(solarApplications)
    .where(eq(solarApplications.userId, userId))
    .orderBy(desc(solarApplications.createdAt));
}

export async function listSolarApplications(status?: SolarStatus) {
  const db = getDb();
  const query = db
    .select({
      application: solarApplications,
      customerName: user.name,
      customerEmail: user.email
    })
    .from(solarApplications)
    .leftJoin(user, eq(user.id, solarApplications.userId));

  const rows = status
    ? await query.where(eq(solarApplications.status, status)).orderBy(desc(solarApplications.createdAt))
    : await query.orderBy(desc(solarApplications.createdAt));

  return rows.map((row) => ({ ...row.application, customerName: row.customerName, customerEmail: row.customerEmail }));
}

export async function updateSolarApplication(
  id: string,
  patch: { status?: SolarStatus; assigneeId?: string | null; staffMemo?: string }
) {
  const [updated] = await getDb()
    .update(solarApplications)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(solarApplications.id, id))
    .returning();

  return updated ?? null;
}

export type InquiryInput = {
  type: string;
  name: string;
  company?: string;
  phone?: string;
  email: string;
  message: string;
};

export async function createInquiry(userId: string | null, input: InquiryInput) {
  const now = new Date().toISOString();
  const [created] = await getDb()
    .insert(inquiries)
    .values({
      userId,
      type: input.type,
      name: input.name,
      company: input.company ?? "",
      phone: input.phone ?? "",
      email: input.email,
      message: input.message,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return created;
}

export async function listInquiries(status?: "received" | "handling" | "done") {
  const db = getDb();
  const query = db.select().from(inquiries);
  return status
    ? query.where(eq(inquiries.status, status)).orderBy(desc(inquiries.createdAt))
    : query.orderBy(desc(inquiries.createdAt));
}

export async function listMyInquiries(userId: string) {
  return getDb()
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.userId, userId)))
    .orderBy(desc(inquiries.createdAt));
}

export async function updateInquiry(
  id: string,
  patch: { status?: "received" | "handling" | "done"; assigneeId?: string | null; staffMemo?: string }
) {
  const [updated] = await getDb()
    .update(inquiries)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(inquiries.id, id))
    .returning();

  return updated ?? null;
}

import bcrypt from "bcrypt";
import postgres from "postgres";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

async function seedUsers() {
  console.log("Starting seedUsers...");
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  console.log("Checked/Created uuid-ossp extension for users.");
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;
  console.log("Users table created or already exists.");

  console.log(`Hashing and inserting ${users.length} users...`);
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    })
  );

  console.log("Finished inserting users.");
  return insertedUsers;
}

async function seedInvoices() {
  console.log("Starting seedInvoices...");
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  console.log("Checked/Created uuid-ossp extension for invoices.");

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;
  console.log("Invoices table created or already exists.");

  console.log(`Inserting ${invoices.length} invoices...`);
  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `
    )
  );

  console.log("Finished inserting invoices.");
  return insertedInvoices;
}

async function seedCustomers() {
  console.log("Starting seedCustomers...");
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  console.log("Checked/Created uuid-ossp extension for customers.");

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;
  console.log("Customers table created or already exists.");

  console.log(`Inserting ${customers.length} customers...`);
  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `
    )
  );

  console.log("Finished inserting customers.");
  return insertedCustomers;
}

async function seedRevenue() {
  console.log("Starting seedRevenue (SERIAL EXECUTION)...");
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;
  console.log("Revenue table created or already exists (SERIAL EXECUTION).");

  console.log(`Inserting ${revenue.length} revenue entries serially...`);
  const insertedResults = []; // Para armazenar os resultados, se necessário

  for (let i = 0; i < revenue.length; i++) {
    const rev = revenue[i];
    const index = i; // Para manter a consistência dos logs com tentativas anteriores

    console.log(
      `[seedRevenue SERIAL] Processing item ${index + 1}/${
        revenue.length
      }: Month: '${rev.month}', Revenue: ${rev.revenue}`
    );
    try {
      const result = await sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `;
      insertedResults.push(result); // Adiciona o resultado da query ao array
      console.log(
        `[seedRevenue SERIAL] Successfully processed item ${
          index + 1
        } for month: '${rev.month}'`
      );
    } catch (error) {
      console.error(
        `[seedRevenue SERIAL] Error inserting item ${index + 1} (Month: '${
          rev.month
        }', Revenue: ${rev.revenue}):`,
        error
      );
      throw error; // Para a execução no primeiro erro e deixa o manipulador GET principal capturá-lo
    }
  }

  console.log("Finished inserting revenue (SERIAL EXECUTION).");
  return insertedResults; // Retorna os resultados ou uma indicação de sucesso
}

export async function GET() {
  console.log("[SEED ROUTE] Received GET request.");
  try {
    console.log("[SEED ROUTE] Starting database transaction/operations...");
    await sql.begin(async (transactionalSql) => {
      // transactionalSql não é usado pelas funções seed atuais
      console.log("[SEED ROUTE] Inside transaction block. Seeding users...");
      await seedUsers();
      console.log("[SEED ROUTE] Users seeded. Seeding customers...");
      await seedCustomers();
      console.log("[SEED ROUTE] Customers seeded. Seeding invoices...");
      await seedInvoices();
      console.log("[SEED ROUTE] Invoices seeded. Seeding revenue...");
      await seedRevenue();
      console.log(
        "[SEED ROUTE] All seed functions completed within transaction block logic."
      );
    });

    console.log("[SEED ROUTE] Database seeded successfully. Sending response.");
    return Response.json({ message: "Database seeded successfully" });
  } catch (error: any) {
    console.error("[SEED ROUTE] Error during seeding:", error);
    return Response.json(
      {
        message: "Failed to seed database",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

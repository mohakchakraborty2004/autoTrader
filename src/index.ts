import { Telegraf } from "telegraf"
import prisma from "./db/db"
import dotenv from "dotenv"

dotenv.config()

const interval = 5000
const BOT_TOKEN = process.env.BOT_TOKEN as string
const bot = new Telegraf(BOT_TOKEN)


async function main() {

}
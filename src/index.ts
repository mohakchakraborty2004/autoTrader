import { Telegraf } from "telegraf"
import prisma from "./db/db"
import dotenv from "dotenv"
import { analyzeTweet, checkCoin, fetchTweets } from "./trader"


dotenv.config()

const interval = 500000
const lastSeen: Record<string, string> = {};
const BOT_TOKEN = process.env.BOT_TOKEN as string
const bot = new Telegraf(BOT_TOKEN)


async function main() {
    const watches =  await prisma.userWatch.findMany({
        include :{
            token : {
                select : {
                    symbol : true
                }
            }
        }
    })
    for (const watch of watches) {
        const tweets = await fetchTweets(watch.Xusername)
        if(!tweets.length) {
            continue;
        }

        const latest = tweets[0];
        const last = lastSeen[watch.Xusername];
        if (last == latest) continue;

        lastSeen[watch.Xusername] = latest

        const aIresponse = await analyzeTweet(latest , tweets.slice(1), watch.token.symbol) 

         if (!(await checkCoin(watch.token.symbol))) {
        await bot.telegram.sendMessage(watch.telegramUserId, `Token ${watch.token.symbol} not found.`);
        continue;
         }

         if (aIresponse) {
          await bot.telegram.sendMessage(watch.telegramUserId, `${aIresponse}`);
         }

    }
     setTimeout(main, interval);
}

bot.command('register', async(ctx) => {
    const [token, xuser] = ctx.msg.text.split(' ').slice(1)
    if (!token || !xuser) {
        return ctx.reply('usage: /register <Token_symbol> <X_username>')
    }

    const exists = await checkCoin(token) 
    if(!exists) return ctx.reply("no such token found blud")
    
    const response = await prisma.user.create({
        data : {
            telegramId : `${ctx.chat.id}`,
        }
    })

    const addTokenToDb = await prisma.token.create({
        data : {
           symbol :   token.toUpperCase()
        }
    })

    if(!response || !addTokenToDb) return ctx.reply("some error occured please try again later")

    const createList =  await prisma.userWatch.create({
    data: {
      telegramUserId: `${ctx.chat.id}`,
      Xusername: xuser.replace('@', ''),
      tokenId : addTokenToDb.id
    }
  });

  if(createList) {
   return ctx.reply(`Now watching ${xuser} for ${token}`)
  } else {
    return ctx.reply("some error occured please try again later")
  }
})


bot.command('list', async (ctx) => {
  const watches = await prisma.userWatch.findMany({ where: { telegramUserId: `${ctx.chat.id}` }, include : {
    token : {
        select : {
            symbol : true
        }
    }
  } });
  if (!watches.length) return ctx.reply('Nothing tracked yet.');
  ctx.reply(watches.map(w => `${w.Xusername} → ${w.token.symbol}`).join('\n'));
});
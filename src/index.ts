import { Telegraf } from "telegraf"
import prisma from "./db/db"
import dotenv from "dotenv"
import { analyzeTweet, buyToken, checkCoin, checkDexCoin, fetchTweets } from "./trader"
import { swapToken } from "./buy"

interface aiResponse {
    shouldBuy : boolean
    reason : string
    amount : number
}

dotenv.config()

//approx 3 to 5 mins 
const interval = 500000
const lastSeen: Record<string, string> = {};
const BOT_TOKEN = process.env.BOT_TOKEN as string
const bot = new Telegraf(BOT_TOKEN)


async function main() {
    console.log("main function")
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

        const aIresponse : aiResponse = await analyzeTweet(latest , tweets.slice(1), watch.token.symbol) 


         if (aIresponse) {
          await bot.telegram.sendMessage(watch.telegramUserId, `

            Should You buy the token based on the analysis = ${aIresponse.shouldBuy}

            Why ? => ${aIresponse.reason}

            {Consider the buying amount based on the response}
            Here's a safe amount to bet = ${aIresponse}
            
            If you want to proceed to buy tokens, enter :

            /buy <private_key> <amount> <token_address>
            
            `
        
        );
         }

    }
     setTimeout(main, interval);
}

bot.command('register', async(ctx) => {
    const [token, tokenAddress, xuser] = ctx.msg.text.split(' ').slice(1)
    if (!token || !xuser || !tokenAddress) {
        return ctx.reply('usage: /register <Token_symbol> <X_username>')
    }

    const exists = await checkDexCoin(tokenAddress) 
    if(!exists){
          return ctx.reply("no such token found blud")
    } else {
        ctx.reply(`Your Token ${token} with address => ${tokenAddress}  is verified, we can proceed with further steps`)
    }
   
    
    const response = await prisma.user.upsert({
        where : {
            telegramId : `${ctx.chat.id}`,
        } , 
        update : {} ,
        create : {
            telegramId : `${ctx.chat.id}`,
        }
    })

    const addTokenToDb = await prisma.token.upsert({
        create : {
           symbol :   token.toUpperCase()
        }, 
        update : {

        }, 
        where : {
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
    ctx.reply(`Now watching ${xuser} for ${token}`)
    main()
  } else {
    return ctx.reply("some error occured please try again later")
  }
})

bot.start(async(ctx) => {
    ctx.reply(`
        Welcome to flyingJatt trader Bot. 
        Please enter the token You want to watch in this format :
        /register <token> <token_address> <twitter_handle> 

        Enter /list to see the current list of trackings. 
        Enter /verify <token_address> to verify your token.

        Enter /help for all commands.

        For any feedback dm us on @I_Mohak19. Thank you.
        `)
})

bot.command('verify', async(ctx) => {
     const [tokenAddress] = ctx.msg.text.split(' ').slice(1)
     const verify = await checkDexCoin(tokenAddress)
     if(verify) {
         return ctx.reply(`token ${tokenAddress} verified`)
     }
    
})

bot.help(async(ctx) => {
    ctx.reply(`
        /register <token> <token_address> <twitter_handle>  (To track the user for token price change prediction)

        /list (to watch which users and tokens you are tracking)

        /verify (to verify the token)

        /help  (to get all the commands)
        
        `)
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

bot.command('buy', async(ctx) => {
      const [private_key, amount, tokenAddress] = ctx.msg.text.split(' ').slice(1)
    if (!private_key || !amount || !tokenAddress) {
        return ctx.reply('usage: /buy <private_key> <amount> <token_address> ')
    }
    const res : any = await buyToken(tokenAddress)



    //to actually buy token 
   // const buy = await swapToken(tokenAddress, Number(amount), private_key)

    return ctx.reply(res.msg)
})

bot.launch();
console.log("starting....")
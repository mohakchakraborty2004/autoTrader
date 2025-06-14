import { Telegraf } from "telegraf"
import prisma from "./db/db"
import dotenv from "dotenv"
import { analyzeTweet, buyToken, checkCoin, checkDexCoin, fetchTweets } from "./trader"
import { swapToken } from "./buy"
import crypto from "crypto-js" 



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
const secret =  process.env.CRYPTO_SECRET as string


async function main( token_address : string) {
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

        const aIresponse : aiResponse = await analyzeTweet(latest , tweets.slice(1), watch.token.symbol, token_address) 


         if (aIresponse) {
          await bot.telegram.sendMessage(watch.telegramUserId, `

            Should You buy the token based on the analysis = ${aIresponse.shouldBuy}

            Why ? => ${aIresponse.reason}

            {Consider the buying amount based on the response}
            Here's a safe amount to bet = ${aIresponse.amount}
            `

            
        
        );

        if (!aIresponse.shouldBuy) {
            await bot.telegram.sendMessage(watch.telegramUserId, `
                
                 If you want to proceed to buy tokens, enter :

                /buy <private_key> <amount> <token_address>
                
                `)
        } else if(aIresponse.shouldBuy) {
            const fetchPK = await prisma.user.findUnique({
                where : {
                    telegramId : watch.telegramUserId
                }, 
                select : {
                    privateKey : true
                }
            })

            if(!fetchPK || !fetchPK.privateKey) {
               await bot.telegram.sendMessage(watch.telegramUserId, `
                 Some error occured
                `)
                continue;
            }

            const private_key = decrypt(fetchPK.privateKey)

            //to actually buy token 
            const buy : any = await swapToken(token_address, Number(aIresponse.amount), private_key)

            if(buy) {
                 await bot.telegram.sendMessage(watch.telegramUserId, `
                
                 ${buy.msg}

                 here's the signature :  ${buy.signature}
                
                `)
                continue;
            } else {
                 await bot.telegram.sendMessage(watch.telegramUserId, `
                    Some error occured
                `)

                continue;
            }

        }
         }

    }
     setTimeout(main, interval);
}



//============================================ bot commands ===============================================

bot.command('register', async(ctx) => {
    const [token, tokenAddress, xuser, private_key] = ctx.msg.text.split(' ').slice(1)
    if (!token || !xuser || !tokenAddress || !private_key) {
        return ctx.reply('usage: /register <Token_symbol> <token_Address> <X_username> <private_key>')
    }

    const exists : any = await checkDexCoin(tokenAddress) 
    if(!exists){
          return ctx.reply("no such token found blud")
    } else {
        ctx.reply(`Your Token ${exists.token} with address => ${tokenAddress}  is verified, we can proceed with further steps`)
    }
   
    
    const response = await prisma.user.upsert({
        where : {
            telegramId : `${ctx.chat.id}`,
        } , 
        update : {} ,
        create : {
            telegramId : `${ctx.chat.id}`,
            privateKey : encrypt(private_key)
        }
    })

    const addTokenToDb = await prisma.token.upsert({
        create : {
           symbol :   exists.token
        }, 
        update : {

        }, 
        where : {
            symbol : exists.token
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
    main(tokenAddress)
  } else {
    return ctx.reply("some error occured please try again later")
  }
})

bot.start(async(ctx) => {
    ctx.reply(`

        Welcome to flyingJatt trader Bot. 
        Please enter the token You want to watch in this format :

        /register <token> <token_address> <twitter_handle> <private_key>

        Enter /list to see the current list of trackings. 

        Enter /verify <token_address> to verify your token.

        Enter /help for all commands.


        ** Please Note we ask for your private key to auto-swap tokens.
        We save it our database safely hashed and maintain full privacy.

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

bot.command('encrypt', async(ctx) => {
     const [tokenAddress] = ctx.msg.text.split(' ').slice(1)
     const enc = encrypt(tokenAddress);
     return ctx.reply(enc)
})

bot.command('decrypt', async(ctx) => {
     const [tokenAddress] = ctx.msg.text.split(' ').slice(1)
    
     return ctx.reply(decrypt(tokenAddress))
    
})

bot.help(async(ctx) => {
    ctx.reply(`
        /register <token> <token_address> <twitter_handle> <private_key>  (To track the user for token price change prediction)

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

function encrypt(text : string) {
     return crypto.AES.encrypt(text, secret).toString()
}

function decrypt(ciphertext: string): string {
  const bytes = crypto.AES.decrypt(ciphertext, secret)
  return bytes.toString(crypto.enc.Utf8)
}


bot.launch();
console.log("starting....")
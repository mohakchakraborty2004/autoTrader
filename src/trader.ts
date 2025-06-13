//twitter client

import { GoogleGenAI, Type } from "@google/genai";
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv"
import axios from "axios";

dotenv.config()

const API_KEY = process.env.API_KEY as string
const API_KEY_SECRET = process.env.API_KEY_SECRET as string
const ACCESS_TOKEN = process.env.ACCESS_TOKEN as string
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET as string
const gemeni_api = process.env.GEMINI_API_KEY

const ai = new GoogleGenAI({apiKey : gemeni_api})

const twitterClient = new TwitterApi({
appKey : API_KEY,
appSecret : API_KEY_SECRET,
accessToken : ACCESS_TOKEN,
accessSecret : ACCESS_TOKEN_SECRET
})

interface DexScreenerResponse {
  pairs: any[] | null;
}

export async function analyzeTweet( tweet : string, history : string[], token: string ) {
    console.log("analysing....")

    const prompt = `Here is the token that is listedd on the market. You will be given the latest tweet of the token's founder
    and based on that you'll tell whether this token will profit me or not in the upcoming days if I buy certain amount of that coin.
    You'll also analyse his previous decisions of tweets. And it should affect the current tweet decison as well.
    You'll tell whether to buy or not, a safe amount to buy and a reason to buy.

    Include the amount to buy in the response to why buy.

    Strictly stick to json response format

    Here is the current tweet = ${tweet}

    Here are the previous tweets = ${history} 

    Here is the token = ${token}


    `

    const instructions =  "You are master of predicting which crypto coin gonna boom. You very perfectly and clearly analyze tweets of coin's founders based on sentiment of the tweets, voice tone , whether it gonna bring a super change in the crypto market. You'll strictly analyse the tweets given to you and tell whther the coin will boom or not."

const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      systemInstruction: instructions,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shouldBuy: {
            type: Type.BOOLEAN,
          },
          reason: {
            type: Type.STRING,
          },
        },
        propertyOrdering: ["shouldBuy", "reason"],
      },
    },
  });

  console.log(response.text)
  return response.text;
}

export async function fetchTweets( username: string) {
    console.log("fetching...")
    const count = 6
    const user = await twitterClient.v2.userByUsername(username)
    if(!user)  {
        return []
    }
    const tweet = await twitterClient.v2.userTimeline(user.data.id, { max_results : count})
    return tweet.data.data?.map(t => t.text) || []
}

export async function checkCoin(token_address : string) {
//  try {
//    const res = await axios.get<DexScreenerResponse>(`https://api.dexscreener.com/latest/dex/tokens/${token_address}`)
//    return res.data.pairs && res.data.pairs.length > 0;

//   } catch (err) {
//     console.error("Jupiter API error:", err);
//     return false;
//   }
 try {
    logger.info(`Trying Solscan API for ${address}`);
    const solscanResponse = await axios.get(`https://public-api.solscan.io/token/meta?tokenAddress=${address}`, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (solscanResponse.data && solscanResponse.data.symbol) {
      logger.info(`Token verified via Solscan: ${solscanResponse.data.symbol}`);
      
      // Check market data
      const hasMarket = await checkTokenMarket(address);
      
      return {
        address,
        symbol: solscanResponse.data.symbol,
        name: solscanResponse.data.name || solscanResponse.data.symbol,
        decimals: solscanResponse.data.decimals || 9,
        market: hasMarket
      };
    }
  } catch (error: any) {
    logger.warn(`Solscan API error: ${error.message}`);
  }

  // T
}

export async function buyToken(token_symbol : string) {
  return {
    msg : `buying ${token_symbol} tokens on jupyter`
  }
}






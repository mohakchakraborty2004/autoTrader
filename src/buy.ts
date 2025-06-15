import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import axios from 'axios';
import bs58 from 'bs58';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
  daily_volume: number;
  created_at: string; // ISO date string
  freeze_authority: string | null;
  mint_authority: string | null;
  permanent_delegate: string | null;
  minted_at: string; // ISO date string
  extensions: {
    coingeckoId: string;
  };
}

interface resp {
    msg : string
    signature : string
}

// Main swap function 
export async function swapToken(
  tokenAddress: string,
  tokenAmount: number,
  privateKey: string | Uint8Array,
  slippage: number = 100 // 1% default
 ): Promise<resp> {
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  try {
    // 1. Create wallet from private key
   const keypair = typeof privateKey === 'string' 
    ? Keypair.fromSecretKey(bs58.decode(privateKey))
    : Keypair.fromSecretKey(privateKey);
   console.log(`Using wallet: ${keypair.publicKey.toString()}`);

    // 2. Get token info and decimals
    const tokenInfoResponse = await axios.get<TokenInfo>(`https://lite-api.jup.ag/tokens/v1/token/${tokenAddress}`);
    const tokenInfo = tokenInfoResponse.data.address === tokenAddress
    
    if (!tokenInfo) {
      throw new Error(`Token not found: ${tokenAddress}`);
    }

    const tokenDecimals = tokenInfoResponse.data.decimals;
    const tokenAmountInSmallestUnit = tokenAmount * Math.pow(10, tokenDecimals);

    console.log(`Buying ${tokenAmount} ${tokenInfoResponse.data.symbol} tokens`);

    // 3. Get quote from Jupiter
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${SOL_MINT}&` +
      `outputMint=${tokenAddress}&` +
      `amount=${tokenAmountInSmallestUnit}&` +
      `slippageBps=${slippage}&` +
      `swapMode=ExactOut`;

    const quoteResponse = await fetch(quoteUrl);
    const quote = await quoteResponse.json();

    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${quote.error}`);
    }

    const solNeeded = parseInt(quote.inAmount) / 1e9;
    console.log(`SOL needed: ${solNeeded}`);

    // 4. Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;

    if (solBalance < solNeeded) {
      throw new Error(`Insufficient balance. Need: ${solNeeded} SOL, Have: ${solBalance} SOL`);
    }

    // 5. Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true
      })
    });

    const swapData = await swapResponse.json();
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapData.error}`);
    }

    // 6. Sign and send transaction
    const txBuffer = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    transaction.sign([keypair]);
    
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    // 7. Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`✅ Success! TX: https://solscan.io/tx/${signature}`);
    // return signature;
    return {
        msg : `✅ Success! TX: https://solscan.io/tx/${signature}` ,
        signature : signature
    }

  } catch (error) {
    console.error('❌ Swap failed:', error);
    throw error;
  }
}

// Helper function to check wallet balance
export async function checkBalance(privateKey: string) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const balance = await connection.getBalance(keypair.publicKey);
  
  return {
    address: keypair.publicKey.toString(),
    solBalance: balance / 1e9
  };
}

// Validate private key
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    Keypair.fromSecretKey(bs58.decode(privateKey));
    return true;
  } catch {
    return false;
  }
}
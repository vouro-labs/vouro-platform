import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { BlockchainProvider, TransactionResult, WalletActivity, TokenBalance } from '@vouro/shared';

export class SolanaBlockchainProvider implements BlockchainProvider {
  private connection: Connection;

  constructor(
    private rpcUrl: string = 'https://api.mainnet-beta.solana.com',
    private heliusApiKey?: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getTransaction(signature: string): Promise<TransactionResult> {
    try {
      // If Helius API key is available, use Enhanced Transactions API
      if (this.heliusApiKey) {
        const response = await axios.post(
          `https://api.helius.xyz/v0/transactions/?api-key=${this.heliusApiKey}`,
          { transactions: [signature] }
        );
        const txData = response.data?.[0];
        if (txData) {
          return {
            signature: txData.signature,
            slot: txData.slot,
            blockTime: txData.timestamp,
            success: txData.transactionError === null,
            signer: txData.feePayer,
            instructions: txData.instructions?.map((i: any) => i.programId) || [],
            programId: txData.instructions?.[0]?.programId || '',
            // Populate token details if it was a token transfer
            tokenMint: txData.tokenTransfers?.[0]?.mint,
            tokenAmount: txData.tokenTransfers?.[0]?.tokenAmount,
          };
        }
      }

      // Fallback to standard web3.js query
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        throw new Error('Transaction not found');
      }

      const signer = tx.transaction.message.accountKeys.find((k) => k.signer)?.pubkey.toBase58() || '';
      const instructions = tx.transaction.message.instructions.map((i: any) => i.programId.toBase58());

      return {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
        success: tx.meta?.err === null,
        signer,
        instructions,
        programId: instructions[0] || '',
      };
    } catch (err) {
      console.error(`Failed to get transaction details for ${signature}:`, err);
      throw err;
    }
  }

  async getWalletActivity(address: string): Promise<WalletActivity[]> {
    try {
      const pubkey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 20 });
      
      return signatures.map((sig) => ({
        signature: sig.signature,
        timestamp: sig.blockTime || Math.floor(Date.now() / 1000),
        type: 'Transfer',
        description: sig.memo || `On-chain transaction at slot ${sig.slot}`,
        success: sig.err === null,
      }));
    } catch (err) {
      console.error(`Failed to fetch wallet activity for ${address}:`, err);
      return [];
    }
  }

  subscribeToAddress(address: string, callback: (event: any) => void): { unsubscribe: () => void } {
    const pubkey = new PublicKey(address);
    const id = this.connection.onAccountChange(pubkey, (accountInfo, context) => {
      callback({ address, accountInfo, slot: context.slot });
    });

    return {
      unsubscribe: () => {
        this.connection.removeAccountChangeListener(id).catch(console.error);
      },
    };
  }

  subscribeToProgram(programId: string, callback: (event: any) => void): { unsubscribe: () => void } {
    const pubkey = new PublicKey(programId);
    const id = this.connection.onProgramAccountChange(pubkey, (keyedAccountInfo, context) => {
      callback({
        programId,
        accountId: keyedAccountInfo.accountId.toBase58(),
        accountInfo: keyedAccountInfo.accountInfo,
        slot: context.slot,
      });
    });

    return {
      unsubscribe: () => {
        this.connection.removeProgramAccountChangeListener(id).catch(console.error);
      },
    };
  }

  async getTokenBalance(address: string, mint: string): Promise<TokenBalance> {
    try {
      const ownerPubKey = new PublicKey(address);
      const mintPubKey = new PublicKey(mint);

      const response = await this.connection.getTokenAccountsByOwner(ownerPubKey, {
        mint: mintPubKey,
      });

      const tokenAccount = response.value[0];
      if (!tokenAccount) {
        return { address, mint, amount: 0, uiAmount: 0, decimals: 9 };
      }

      const balanceRes = await this.connection.getTokenAccountBalance(tokenAccount.pubkey);
      return {
        address: tokenAccount.pubkey.toBase58(),
        mint,
        amount: parseInt(balanceRes.value.amount),
        uiAmount: balanceRes.value.uiAmount || 0,
        decimals: balanceRes.value.decimals,
      };
    } catch (err) {
      console.error(`Failed to get token balance for wallet ${address} & token ${mint}:`, err);
      return { address, mint, amount: 0, uiAmount: 0, decimals: 9 };
    }
  }
}

import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { IDL } from '../tic_tac_toe';
import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { idToTile, setTiles } from './utils.js';

const turnEl = document.getElementById('turn');
const playerTurnEl = document.getElementById('player-turn');

window.Buffer = Buffer;
window.program = null;

export const PROGRAM_ID = new PublicKey(
  '6nGpXemBCiPJRFdzheSMQAPnu7ntyfQiycNjMBpbLXaa'
);

export const connection = new Connection('http://localhost:8899', 'processed');

export function connectWallet() {
  const wallet = new PhantomWalletAdapter();
  const provider = new AnchorProvider(connection, wallet, {});
  setProvider(provider);
  const program = new Program(IDL, PROGRAM_ID, provider);
  window.program = program;
}

export async function startGame() {
  const gameId = sessionStorage.getItem('gameId');
  const playerOnePublicKey = new PublicKey(
    sessionStorage.getItem('playerOnePublicKey')
  );
  const playerTwoPublicKey = new PublicKey(
    sessionStorage.getItem('playerTwoPublicKey')
  );
  const gamePublicKey = deriveGamePublicKey(
    playerOnePublicKey,
    gameId,
    PROGRAM_ID
  );
  sessionStorage.setItem('gamePublicKey', gamePublicKey.toString());

  await program.methods
    .setupGame(playerTwoPublicKey, gameId)
    .accounts({
      playerOne: window.phantom.solana.publicKey,
      game: gamePublicKey
    });

  await updateBoard();
}

export async function handlePlay(id) {
  const tile = idToTile(id);

  await updateBoard();

  const gamePublicKey = new PublicKey(sessionStorage.getItem('gamePublicKey'));
  await program.methods
    .play(tile)
    .accounts({
      player: window.phantom.solana.publicKey,
      game: gamePublicKey
    });

  await updateBoard();
}

export function deriveGamePublicKey(playerOnePublicKey, gameId, programId) {
  const [gamePublicKey, _] = PublicKey.findProgramAddressSync(
    [Buffer.from('game'), playerOnePublicKey.toBuffer(), Buffer.from(gameId)],
    programId
  );
  return gamePublicKey;
}

export async function getGameAccount() {
  const gamePublicKey = new PublicKey(sessionStorage.getItem('gamePublicKey'));
  const gameData = await program.account.game.fetch(gamePublicKey);
  turnEl.textContent = gameData.turn;
  playerTurnEl.textContent = gameData.turn % 2 === 0 ? 'O' : 'X';
  return gameData;
}

export async function updateBoard() {
  const gameData = await getGameAccount();
  const board = gameData.board;

  setTiles(board);
}

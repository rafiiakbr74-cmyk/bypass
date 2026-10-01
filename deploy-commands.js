// bot/deploy-commands.js
// Registers the single /bypass slash command with Discord.
//   node bot/deploy-commands.js
// Set DISCORD_GUILD_ID in .env for instant registration in one server
// (global commands can take up to ~1 hour to appear).
import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('\u274c Need DISCORD_TOKEN and DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('bypass')
    .setDescription('Bypass link (Linkvertise, LootLabs, AdF.ly, ouo.io & 1000+ shortener)')
    .addStringOption((o) =>
      o.setName('url').setDescription('Link yang mau di-bypass').setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    const route = DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
      : Routes.applicationCommands(DISCORD_CLIENT_ID);

    await rest.put(route, { body: commands });
    console.log(
      `\u2705 Registered ${commands.length} command ${
        DISCORD_GUILD_ID ? `to guild ${DISCORD_GUILD_ID}` : 'globally'
      }`
    );
  } catch (e) {
    console.error('\u274c Failed to register commands:', e);
  }
})();

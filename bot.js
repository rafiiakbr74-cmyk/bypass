// bot/bot.js
// Discord bot logic — a SINGLE command: /bypass
// Uses the FREE, self-hosted bypass engine (lib/freebypass.js) — no API key needed.
//
// Render-friendly:
//   • The /bypass command is AUTO-REGISTERED on startup (no `npm run bot:deploy` needed).
//   • Reads DISCORD_TOKEN (required) and DISCORD_CLIENT_ID (optional, auto-detected).
//   • Set DISCORD_GUILD_ID to register instantly in one server (otherwise global, ~1h).
import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { bypassUrl, SUPPORTED } from '../lib/bypass.js';

const COLOR_OK = 0x8b5cf6; // purple
const COLOR_ERR = 0xef4444; // red

// customId of the "Copy" button.
const COPY_BUTTON_ID = 'a2_copy';

// The one and only command.
export const commands = [
  new SlashCommandBuilder()
    .setName('bypass')
    .setDescription('Bypass link (Linkvertise, LootLabs, AdF.ly, ouo.io & 1000+ shortener)')
    .addStringOption((o) =>
      o.setName('url').setDescription('Link yang mau di-bypass').setRequired(true)
    )
    .toJSON(),
];

// Extract the raw result from a success embed's code block.
function extractResultFromEmbed(embed) {
  const desc = embed?.description || '';
  const m = desc.match(/```\n?([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

// Auto-register the slash command(s) using the bot token.
async function registerCommands(client, token) {
  try {
    // Prefer DISCORD_CLIENT_ID from env; fall back to the id from the token.
    const appId = process.env.DISCORD_CLIENT_ID || client.application?.id || client.user?.id;
    const guildId = process.env.DISCORD_GUILD_ID;
    const rest = new REST({ version: '10' }).setToken(token);
    const route = guildId
      ? Routes.applicationGuildCommands(appId, guildId)
      : Routes.applicationCommands(appId);

    await rest.put(route, { body: commands });
    console.log(
      `✅ Command /bypass terdaftar ${
        guildId ? `di server ${guildId} (langsung muncul)` : 'secara GLOBAL (bisa sampai ~1 jam)'
      }`
    );
  } catch (e) {
    console.warn('⚠️  Gagal daftar command otomatis:', e.message);
  }
}

// Build the success embed + Copy button.
function buildSuccessReply(out, ms) {
  const lines = [`[🔗 Buka link](${out.result})`, '```', out.result, '```'];
  if (out.title) lines.push(`🏷️ **${out.title}**`);
  if (out.note) lines.push(`ℹ️ ${out.note}`);
  lines.push('', '📋 Tekan tombol **Copy** di bawah buat nyalin hasilnya.');

  const embed = new EmbedBuilder()
    .setColor(COLOR_OK)
    .setTitle('✅ Bypass berhasil')
    .setDescription(lines.join('\n'))
    .setFooter({
      text: `sumber: ${out.provider}${out.service ? ' · ' + out.service : ''} · ${ms} ms`,
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(COPY_BUTTON_ID)
      .setLabel('Copy')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

// Build the error embed (no Copy button).
function buildErrorReply(err) {
  const embed = new EmbedBuilder()
    .setColor(COLOR_ERR)
    .setTitle('❌ Bypass gagal')
    .setDescription(
      (err.message || 'Terjadi error') +
        '\n\n**Yang bisa di-bypass gratis:**\n' +
        SUPPORTED.free.map((s) => '• ' + s).join('\n') +
        '\n\n**Butuh captcha (gak bisa gratis):**\n' +
        SUPPORTED.captchaGated.slice(0, 4).map((s) => '• ' + s).join('\n')
    )
    .setTimestamp();

  return { embeds: [embed] };
}

// Starts the Discord bot. Returns the Client (or null if no token).
export function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error(
      '❌ DISCORD_TOKEN tidak ada. Isi di Render → Environment (atau .env saat lokal). Bot tidak dijalankan.'
    );
    return null;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Logged in as ${c.user.tag}`);

    // Optional custom avatar from a URL.
    if (process.env.BOT_AVATAR_URL) {
      try {
        await c.user.setAvatar(process.env.BOT_AVATAR_URL);
        console.log('🖼️  Avatar updated');
      } catch (e) {
        console.warn('⚠️  Could not set avatar:', e.message);
      }
    }

    // Custom status.
    c.user.setPresence({
      activities: [{ name: '/bypass', type: ActivityType.Watching }],
      status: 'online',
    });

    // Auto-register the command (so no local CLI step is needed).
    await registerCommands(c, token);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    // --- Copy button ---
    if (interaction.isButton()) {
      if (interaction.customId !== COPY_BUTTON_ID) return;

      const result = extractResultFromEmbed(interaction.message?.embeds?.[0]);
      if (!result) {
        await interaction.reply({
          content: '⚠️ Gak bisa ambil hasilnya. Coba jalankan `/bypass` lagi ya.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Honest, Discord-native copy helper:
      // A bot CANNOT write to the user's device clipboard. The closest native
      // mechanism is a code block, which Discord mobile lets you long-press → Copy.
      await interaction.reply({
        content:
          '📋 **Cara copy hasilnya:**\n' +
          'Tekan & tahan (long-press) teks di bawah, lalu pilih **Copy**.\n\n' +
          '```\n' +
          result +
          '\n```\n' +
          '_(Bot Discord tidak bisa nulis ke clipboard HP kamu otomatis — ini cara paling gampang & jujur.)_',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // --- Slash command ---
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'bypass') return;

    const url = interaction.options.getString('url');

    await interaction.deferReply();
    const t0 = Date.now();

    try {
      const out = await bypassUrl(url, { provider: 'auto' });
      const ms = Date.now() - t0;
      await interaction.editReply(buildSuccessReply(out, ms));
    } catch (e) {
      await interaction.editReply(buildErrorReply(e));
    }
  });

  client.login(token).catch((e) => {
    console.error('❌ Gagal login ke Discord:', e.message);
  });

  return client;
}

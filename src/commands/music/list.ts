import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { useQueue, type Track } from 'discord-player';
import type { Message } from 'discord.js';

const QUEUE_PREVIEW_LIMIT = 10;
const MAX_TITLE_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1900;

@ApplyOptions<Command.Options>({
  description: '현재 대기열에 있는 곡들을 보여줍니다.',
  aliases: ['l', '목록', '대기열', 'queue'],
  preconditions: ['MainOnly', 'CommandChannel'],
})
export class UserCommand extends Command {
  public override async messageRun(message: Message): Promise<void> {
    const result = this.buildList(message.guildId);

    if (message.channel.isSendable()) {
      await message.channel.send(result);
    }
  }

  private buildList(guildId: string | null): string {
    if (!guildId) {
      return '이 명령은 서버에서만 사용할 수 있습니다.';
    }

    const queue = useQueue(guildId);
    const current = queue?.currentTrack;

    if (!queue || !current) {
      return '❌ 현재 재생 중인 곡이 없습니다.';
    }

    const pendingCount = queue.tracks.size;
    const progress = queue.node.getTimestamp();
    const nowPlaying = progress
      ? `${formatTrack(current)} \`${progress.current.label} / ${progress.total.label}\``
      : formatTrack(current);

    const lines = [`🎶 현재 재생 중인 곡: ${nowPlaying}`, '📝 대기열:'];

    if (pendingCount === 0) {
      lines.push('대기열에 곡이 없습니다.');
      return joinWithinLimit(lines);
    }

    // WHY: toArray() copies the whole store. We only render the first N tracks.
    const preview = queue.tracks.store.slice(0, QUEUE_PREVIEW_LIMIT);
    for (let i = 0; i < preview.length; i++) {
      lines.push(`${i + 1}. ${formatTrack(preview[i])}`);
    }

    if (pendingCount > QUEUE_PREVIEW_LIMIT) {
      lines.push(`...그리고 ${pendingCount - QUEUE_PREVIEW_LIMIT}곡이 더 대기 중입니다.`);
    }

    lines.push(`총 대기 중인 노래: ${pendingCount}곡 (${queue.durationFormatted})`);
    return joinWithinLimit(lines);
  }
}

function formatTrack(track: Track): string {
  const title = sanitizeTitle(track.title);
  const duration = track.duration ? ` \`${track.duration}\`` : '';
  return `[${title}](${track.url})${duration}`;
}

function sanitizeTitle(title: string): string {
  const cleaned = title.replaceAll(/[[\]]/g, '').trim() || 'Unknown';
  if (cleaned.length <= MAX_TITLE_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

function joinWithinLimit(lines: string[]): string {
  const parts: string[] = [];
  let length = 0;

  for (const line of lines) {
    const extra = parts.length === 0 ? line.length : line.length + 1;
    if (length + extra > MAX_MESSAGE_LENGTH) {
      parts.push('…');
      break;
    }

    parts.push(line);
    length += extra;
  }

  return parts.join('\n');
}

export interface PushProvider {
  send(userId: string, title: string, body: string): Promise<void>;
}

export class NoopPushProvider implements PushProvider {
  async send(): Promise<void> {
    /* intentionally empty */
  }
}

export const notificationsModule = {
  id: 'notifications',
  isEnabled(flags: Record<string, boolean>) {
    return flags.notifications === true;
  },
};

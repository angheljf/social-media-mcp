export interface SocialMediaPost {
  content: string;
  platform: string;
  timestamp: string;
  threadId?: string;
  tweetId?: string
}

export interface PostArgs {
  content: string;
  threadId?: string;
}

export interface ListPostsArgs {
    limit?: number;
    threadId?: string;
}

export function isValidPostArgs(args: any): args is PostArgs {
  return (
      typeof args === "object" &&
      args !== null &&
      "content" in args &&
      typeof args.content === "string" &&
      (args.threadId === undefined || typeof args.threadId === "string")
  );
}


export function isValidListPostsArgs(args: any): args is ListPostsArgs {
    return (
        typeof args === "object" &&
        args !== null &&
        (args.limit === undefined || typeof args.limit === "number") &&
        (args.threadId === undefined || typeof args.threadId === "string")
    );
}

export interface SocialMediaPlatform {
    name: string;
    description: string;
}

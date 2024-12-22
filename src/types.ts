export interface SocialMediaPost {
  content: string;
  platform: string;
  timestamp: string;
}

export interface PostArgs {
  content: string;
}

export interface ListPostsArgs {
    limit?: number;
}

export function isValidPostArgs(args: any): args is PostArgs {
  return (
      typeof args === "object" &&
      args !== null &&
      "content" in args &&
      typeof args.content === "string"
  );
}


export function isValidListPostsArgs(args: any): args is ListPostsArgs {
    return (
        typeof args === "object" &&
        args !== null &&
        (args.limit === undefined || typeof args.limit === "number")
    );
}

export interface SocialMediaPlatform {
    name: string;
    description: string;
}

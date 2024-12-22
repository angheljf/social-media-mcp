#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { SocialMediaPost, PostArgs, isValidPostArgs, SocialMediaPlatform, ListPostsArgs, isValidListPostsArgs } from "./types.js";
import { TwitterApi } from 'twitter-api-v2';


dotenv.config();

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error("Twitter API keys are required in .env file");
}

const twitterClient = new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET
});


class SocialMediaServer {
    private server: Server;
    private socialMediaPosts: SocialMediaPost[] = [];
    private socialMediaPlatforms: SocialMediaPlatform[] = [
        {
            name: "X",
            description: "Post to X (formerly Twitter)",
        }
    ];


    constructor() {
        this.server = new Server(
            {
                name: "social-media-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {}
                },
            }
        );

        this.setupHandlers();
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };

        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupHandlers(): void {
        this.setupToolHandlers();
        this.setupResourceHandlers();
    }

    private setupResourceHandlers(): void {
        this.server.setRequestHandler(
            ListResourcesRequestSchema,
            async () => ({
                resources: this.socialMediaPlatforms.map(platform => ({
                    uri: `socialmedia://platforms/${platform.name.toLowerCase()}`,
                    name: `Social Media: ${platform.name}`,
                    mimeType: "application/json",
                    description: `Information about the ${platform.name} platform`,
                }))
            })
        );

        this.server.setRequestHandler(
            ReadResourceRequestSchema,
            async (request) => {
                const platformName = request.params.uri.split('/').pop()?.toLowerCase();
                const platform = this.socialMediaPlatforms.find(p => p.name.toLowerCase() === platformName);
                if (!platform) {
                    throw new McpError(ErrorCode.InvalidRequest, `Unknown social media platform: ${request.params.uri}`);
                }
                return {
                    contents: [{
                        uri: request.params.uri,
                        mimeType: "application/json",
                        text: JSON.stringify(platform, null, 2),
                    }]
                }
            }
        )
    }

    private setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "post_to_x",
                    description: "Post a message to X (formerly Twitter)",
                    inputSchema: {
                        type: "object",
                        properties: {
                            content: { type: "string", description: "Content of the post" },
                        },
                        required: ["content"],
                    },
                },
                {
                    name: "list_x_posts",
                    description: "List X (formerly Twitter) posts",
                    inputSchema: {
                        type: "object",
                        properties: {
                            limit: {
                                type: "number",
                                description: "Maximum number of posts to return"
                            }
                        }
                    }
                }
            ],
        }));


        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request) => {
                if (request.params.name === "post_to_x") {
                    if (!isValidPostArgs(request.params.arguments)) {
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            "Invalid post arguments"
                        );
                    }
                    const { content } = request.params.arguments;
                    try {
                        const tweet = await twitterClient.v2.tweet(content)
                         const newPost: SocialMediaPost = {
                            content,
                            platform: "X",
                             timestamp: new Date().toISOString()
                        };
                        this.socialMediaPosts.push(newPost);
                         return {
                            content: [
                                {
                                    type: "text",
                                    text: `Successfully posted to X: ${content}. Tweet ID: ${tweet.data.id}`,
                                },
                            ],
                        };
                    }
                    catch(error: any) {
                         return {
                            isError: true,
                            content: [
                                {
                                    type: "text",
                                    text: `Failed to post to X: ${error.message}`,
                                },
                            ],
                        };
                    }
                } else if (request.params.name === "list_x_posts") {
                    if(!isValidListPostsArgs(request.params.arguments)) {
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            "Invalid list posts arguments"
                        )
                    }
                    const { limit } = request.params.arguments;
                    let filteredPosts = this.socialMediaPosts;
                    if(limit){
                        filteredPosts = filteredPosts.slice(0, limit);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(filteredPosts, null, 2)
                        }]
                    }
                }
                 throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
        );
    }

    async run(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        console.error("Social Media MCP server running on stdio");
    }
}

const server = new SocialMediaServer();
server.run().catch(console.error);
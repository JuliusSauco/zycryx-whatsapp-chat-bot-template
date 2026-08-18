import {YouTube, type Video} from 'youtube-sr';

export interface YouTubeSearchVideo {
    type: 'video';
    videoId: string;
    title: string;
    url: string;
    image?: string;
    thumbnail?: string;
    ago?: string;
    views?: number;
    timestamp?: string;
    duration?: {
        seconds?: number;
    };
}

export interface YouTubeSearchResult {
    videos: YouTubeSearchVideo[];
    all: YouTubeSearchVideo[];
}

function toSearchVideo(video: Video): YouTubeSearchVideo | null {
    if (!video.id || !video.title) return null;
    const thumbnail = video.thumbnail?.url;
    return {
        type: 'video',
        videoId: video.id,
        title: video.title,
        url: video.url,
        image: thumbnail,
        thumbnail,
        ago: video.uploadedAt,
        views: video.views,
        timestamp: video.durationFormatted,
        duration: {seconds: video.duration},
    };
}

export async function searchYouTubeVideos(query: string, limit = 20): Promise<YouTubeSearchResult> {
    const videos = (await YouTube.search(query, {
        type: 'video',
        limit: Math.max(1, Math.min(50, limit)),
        safeSearch: true,
    })).map(toSearchVideo).filter((video): video is YouTubeSearchVideo => video !== null);

    return {videos, all: videos};
}

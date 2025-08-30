let lastVideo: string | null = 'lofi-1.mp4';

export function getRandomRockVideoNoRepeat(): string {
    const videos = [
        'rock-1.mp4',
        'rock-2.mp4',
        'rock-3.mp4'
    ];

    let randomVideo;
    do {
        const randomIndex = Math.floor(Math.random() * videos.length);
        randomVideo = videos[randomIndex];
    } while (randomVideo === lastVideo);

    lastVideo = randomVideo;
    return randomVideo;
}
let lastVideo: string | null = 'lofi-1.mp4';

export function getRandomLofiVideoNoRepeat(): string {
    const videos = [
        'lofi-1.mp4',
        'lofi-2.mp4',
        'lofi-3.mp4',
        'lofi-5.mp4',
        'lofi-6.mp4',
        'lofi-7.mp4',
        'lofi-8.mp4',
    ];

    let randomVideo;
    do {
        const randomIndex = Math.floor(Math.random() * videos.length);
        randomVideo = videos[randomIndex];
    } while (randomVideo === lastVideo);

    lastVideo = randomVideo;
    return randomVideo;
}
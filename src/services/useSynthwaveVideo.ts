let lastVideo: string | null = 'lofi-1.mp4';

export function getRandomSynthwaveVideoNoRepeat(): string {
    const videos = [
        'synthwave-1.mp4',
        'synthwave-2.mp4',
        'synthwave-3.mp4',
        'synthwave-4.mp4',
        'synthwave-5.mp4',
        'synthwave-6.mp4',
        'synthwave-7.mp4',
    ];

    let randomVideo;
    do {
        const randomIndex = Math.floor(Math.random() * videos.length);
        randomVideo = videos[randomIndex];
    } while (randomVideo === lastVideo);

    lastVideo = randomVideo;
    return randomVideo;
}
import { Scene } from 'phaser';
const dpr = window.devicePixelRatio || 1;
export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {

    }

    create ()
    {
        this.scene.start('Preloader');
    }
}

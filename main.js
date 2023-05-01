const can = document.documentElement.querySelector('canvas');
const ctx = can.getContext('2d');
// import {Howl, Howler} from 'howler';
new FontFace('Mukta', 'assets/Kanit-Regular.ttf')


let resolution = [1920, 1080];
let width = document.documentElement.clientWidth;
let height = document.documentElement.clientHeight;
let scale_x = width / resolution[0];
let scale_y = height / resolution[1];
let fps = 0;
let money = 0;

const background_sound = new Howl({
  src: ['assets/background_music.mp3'],
  volume: 0.3,
  autoplay: true,
  loop: true,
  onended: function() {
    console.log('sound')
  }
})

const shoot_sound = new Howl({
  src: ['assets/shoot_sound_0.mp3'],
  volume: 0.2,
  onended: function() {
    console.log('sound')
  }
})

const boom_sound = new Howl({
  src: ['assets/boom_sound_0.mp3'],
  sprite: {
    'main': [300, 800]
  },
  volume: 0.6,
  onended: function() {
    console.log('sound')
  }
})

let bullet_list = {};
let enemy_list = {};
let boom_list = {};
let coin_list = {};

const uniq = u();

function u() {
  let timer = 0;
  return function() {
    return timer++;
  }
}


const image = {};
function img(src) {
  const elem = image[src];
  if(!!elem) {
    return elem
  }else {
    let i = new Image();
    i.src = src;
    image[src] = i;
    return i;
  }
}

function resize() {
  width = document.documentElement.clientWidth;
  height = document.documentElement.clientHeight;
  scale_x = width / resolution[0];
  scale_y = height / resolution[1];
  can.width = width;
  can.height = height;
}

resize()

class Object_m {
  constructor(args) {
    this.id = uniq();
    this.x = args.x;
    this.y = args.y;
    this.w = args.w;
    this.h = args.h;
    this.x_frame = 0;
    this.y_frame = 0;
    this.anim = null;
    this.timeout = null;
    this.anim_priority = 0;
    this.anim_step = 0;
    this.time = Date.now();
    this.sprite = args.sprite;
    this.colide = args.colide;
    this.health = args.health;
  }

  animate() {
    if( this.anim_step <= 0 ) {
      return;
    }

    this.anim_delay -= 1000 / fps;

    if( this.anim_delay <= 0 ) {

      if( this.anim_step > 1 ) {

        this.x_frame++;
        this.anim_step -= 1;
        this.anim_delay = this.max_anim_delay;

      }else {

        if( this.next_anim_delay <= 0 ) {
          this.next_anim_delay = 0;
          this.anim_step = 0;
        }

        this.x_frame = 0;
        this.next_anim_delay -= 1000 / fps;

      }

    }

  }

  start_animate( steps, type, repeat_after, priority, delay ) {
    if( this.anim_step > 0 && this.anim_priority >= priority ) {
      return;
    }
    
    this.anim_step = steps + 1;
    this.next_anim_delay = delay;
    this.max_anim_delay = repeat_after;
    this.anim_delay = 0;
    this.anim_priority = priority;
    this.x_frame = 0;
    this.y_frame = type;

  }
}

class Player extends Object_m {
  constructor(args) {
    super(args);
    this.angle = 0;
  }
}

class Bullet extends Object_m {
  constructor(args) {
    super(args);
    this.angle = args.angle ?? 0;
    this.speed = 20;
    this.damage = 20;
    bullet_list[this.id] = this;
  }

  move() {
    //Вычисляем значение времени и ускорение
    let delta_time = ( 1000 / fps ) / (1000 / 60);

    //Хз че чтобы нан не было
    if( isNaN( delta_time ) ) {
      delta_time = 1;
    }

    //Вычисляем расстояния по осям до целевой точки
    const y_side = Math.sin(this.angle) * this.speed;
    const x_side = Math.cos(this.angle) * this.speed;

    // Обновляем позицию игрока
    this.x -= x_side * delta_time || 0;
    this.y -= y_side * delta_time || 0;

    const dist = Math.hypot(this.x, this.y);

    if(dist > resolution[0] * 2) {
      delete bullet_list[this.id];
    }

    for(let i in enemy_list) {
      let { x, y } = enemy_list[i];
      const dist = Math.hypot(this.x + resolution[0] / 2 - x, this.y + resolution[1] - player.h + player.y + 50 - y)

      if(dist < 50) {
        enemy_list[i].health -= this.damage;
        let boom = new Boom({
          x: this.x + resolution[0] / 2,
          y: this.y + resolution[1] - player.h + player.y + 50,
          w: 128,
          h: 128,
          sprite: 'assets/boom_0.png'
        })
        boom.start(); 
        delete bullet_list[this.id];
      }
    }

  }

}

class Boom extends Object_m {
  constructor(args) {
    super(args);
    boom_list[this.id] = this;
  }

  start() {
    boom_sound.play('main');
    setTimeout(() => {
      delete boom_list[this.id];
    }, 40 * 14);
  }
}
class Coin extends Object_m {
  constructor(args) {
    super(args);
    this.speed_y = -2;
    this.speed_x = rand(0, 1) == 1 ? -1 : 1;
    coin_list[this.id] = this;
  }
}

class Enemy extends Object_m {
  constructor(args) {
    super(args);
    this.speed = args.speed;
    this.max_health = args.max_health;
    enemy_list[this.id] = this;
  }

  draw_health() {
    if(this.health < this.max_health) {
      ctx.beginPath();
      ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
      ctx.fillStyle = '#36eb54';
      ctx.fillRect(this.x - 50, this.y - this.h - 30, this.health / this.max_health * 100, 15)
      ctx.setTransform( 1, 0, 0, 1, 0, 0 );
      ctx.closePath();
    }
    if(this.health <= 0) {
      new Coin({
        x: this.x,
        y: this.y,
        w: 32,
        h: 32,
        sprite: 'assets/coin_0.png'
      })
      delete enemy_list[this.id]
    }
    if(this.y > height + this.h) {
      delete enemy_list[this.id]
    }
  }
}

function rand(min, max) {
  let rand = min + Math.random() * (max + 1 - min);
  return Math.floor(rand);
}

function spawn_enemy() {
  new Enemy({
    x: rand(0, resolution[0]),
    y: rand(-200, -500),
    w: 64,
    h: 64,
    sprite: 'assets/enemy_0.png',
    health: 50,
    max_health: 50,
    speed: 0.75,
  })
}

setInterval(() => {
  spawn_enemy();
}, 1000);

let player = new Player({
  x: 0,
  y: 0,
  w: 192,
  h: 192,
  colide: 24,
  health: 100,
})

document.addEventListener('mousemove', (e) => {

  mouse_coords = [e.clientX / scale_x, e.clientY / scale_y];

  const x_gap = ( -80 * Math.cos( player.angle + 0.45 ) );
  const y_gap = ( -80 * Math.sin( player.angle + 0.45 ) );

  const x_dist = resolution[0] / 2 - mouse_coords[0];
  const y_dist = resolution[1] - player.h - mouse_coords[1];

  const max_angle = Math.atan2( resolution[1] / 2 + y_gap - mouse_coords[1], resolution[0] / 2 + x_gap - mouse_coords[0] );
  const angle = Math.atan2( y_dist, x_dist );

  player.angle = angle;

})

let engine_type = 0;
let gun_type = 0;
let gun_anim = 0;
let gun_anim_max = 7;
let engine_anim = 0;

let mouse_down = false;
let counter = 0;

document.addEventListener('pointerdown', (e) => {

  mouse_down = true;

  if(gun_anim > 0) {
    return;
  }

  let si = setInterval(() => {
    gun_anim++
    if(gun_anim == 1) {
      const x_gap = (-80 * Math.cos(player.angle + 0.45));
      const y_gap = (-80 * Math.sin(player.angle + 0.45));
      new Bullet({
        x: x_gap,
        y: y_gap,
        w: 128,
        h: 128,
        sprite: 'assets/bullet_0.png',
        angle: player.angle,
      })
      shoot_sound.play();
    }
    if(gun_anim == 2) {
      const x_gap = (-80 * Math.cos(player.angle - 0.45));
      const y_gap = (-80 * Math.sin(player.angle - 0.45));
      new Bullet({
        x: x_gap,
        y: y_gap,
        w: 128,
        h: 128,
        sprite: 'assets/bullet_0.png',
        angle: player.angle,
      })
      shoot_sound.play();
    }
    if(gun_anim >= gun_anim_max) {
      gun_anim = 0;
      if(!mouse_down) {
        clearInterval(si);
      }
    }
  }, 50);

})

document.addEventListener('pointerup', (e) => {
  mouse_down = false;
})

function draw_player() {
  const health = Math.ceil(player.health / 25);
  ctx.beginPath();
  ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
  ctx.translate( resolution[0] / 2, resolution[1] - player.h + player.y + 50 );
  ctx.rotate( player.angle + Math.PI / 2 || 0 );
  ctx.drawImage(
    img(`assets/gun_${gun_type}.png`), 
    player.w * (6 - gun_anim),
    player.h * 0,
    player.w,
    player.h,
    player.w / -2,
    player.h / -2,
    player.w,
    player.h,
  );
  ctx.drawImage(
    img(`assets/engine_${engine_type}.png`), 
    player.w * player.x_frame,
    player.h * player.y_frame,
    player.w,
    player.h,
    player.w / -2,
    player.h / -2,
    player.w,
    player.h,
  );
  ctx.drawImage(
    img(`assets/player_${health}.png`), 
    player.w * player.x_frame,
    player.h * player.y_frame,
    player.w,
    player.h,
    player.w / -2,
    player.h / -2,
    player.w,
    player.h,
  );
  ctx.setTransform( 1, 0, 0, 1, 0, 0 );
  ctx.closePath();
}

let fps_timer = Date.now();

function draw() {
  counter += 4
  if(counter > 180) {
    counter = -180
  }
  player.y -= 0.5 * Math.sin(counter * Math.PI / 180);

  fps = 1000 / ( Date.now() - fps_timer );
  fps_timer = Date.now();

  ctx.beginPath();
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img('assets/bg1.png'), 0, 0)
  ctx.closePath();

  draw_player()

  for(let item in bullet_list) {
    item = bullet_list[item];
    item.start_animate(3, 0, 50, 1, 50);
    item.animate();
    item.move();
    ctx.beginPath();
    ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
    ctx.translate( resolution[0] / 2 + item.x, resolution[1] - player.h + player.y + 50 + item.y );
    ctx.rotate( item.angle + Math.PI / 2 || 0 );
    ctx.drawImage(
      img(item.sprite), 
      item.w * item.x_frame,
      item.h * 0,
      item.w,
      item.h,
      item.w / -2,
      item.h / -2,
      item.w,
      item.h,
    );
    ctx.setTransform( 1, 0, 0, 1, 0, 0 );
    ctx.closePath();
  }

  for(let item in enemy_list) {
    item = enemy_list[item];
    item.y += item.speed;
    item.draw_health();
    ctx.beginPath();
    ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
    ctx.translate( item.x, item.y );
    ctx.rotate( item.angle + Math.PI / 2 || 0 );
    ctx.drawImage(
      img(item.sprite), 
      item.w * item.x_frame,
      item.h * 0,
      item.w,
      item.h,
      item.w / -2,
      item.h / -2,
      item.w,
      item.h,
    );
    ctx.setTransform( 1, 0, 0, 1, 0, 0 );
    ctx.closePath();
  }
  for(let i in boom_list) {
    let item = boom_list[i];
    item.start_animate(13, 0, 40, 0, 40);
    item.animate();
    ctx.beginPath();
    ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
    ctx.translate( item.x, item.y );
    ctx.drawImage(
      img(item.sprite), 
      item.w * item.x_frame,
      item.h * 0,
      item.w,
      item.h,
      item.w / -2,
      item.h / -2,
      item.w,
      item.h,
    );
    ctx.setTransform( 1, 0, 0, 1, 0, 0 );
    ctx.closePath();
  }
  for(let i in coin_list) {
    let item = coin_list[i];
    item.y += item.speed_y;
    item.x += item.speed_x;
    item.speed_y += 0.1;
    if(item.y > resolution[1]) {
      console.log('a')
      money += 1;
      delete coin_list[item.id];
    }
    ctx.beginPath();
    ctx.setTransform( scale_x, 0, 0, scale_y, 0, 0 );
    ctx.translate( item.x, item.y );
    ctx.drawImage(
      img(item.sprite), 
      item.w * item.x_frame,
      item.h * 0,
      item.w,
      item.h,
      item.w / -2,
      item.h / -2,
      item.w,
      item.h,
    );
    ctx.setTransform( 1, 0, 0, 1, 0, 0 );
    ctx.closePath();
  }

  ctx.beginPath();
  ctx.font = 'normal 48px Mukta';
  ctx.fillStyle = 'white';
  ctx.fillText(`$${money}`, 50, 100);
  ctx.closePath();

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
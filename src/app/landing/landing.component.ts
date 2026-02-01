import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

declare var THREE: any;
declare var TweenMax: any;
declare var TimelineMax: any;
declare var Power0: any;
declare var Power2: any;
declare var Elastic: any;

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private scene!: any;
  private camera!: any;
  private renderer!: any;
  private galaxy!: any;
  private wrap!: any;
  private raycaster!: any;
  private mouse: any;
  private hovered: number[] = [];
  private prevHovered: number[] = [];
  private dotsGeometry!: any;
  private segmentsGeom!: any;
  private attributePositions!: any;
  private attributeSizes!: any;
  private resizeTm: any;
  private animationId: any;
  private colors: any[] = [];

  ngOnInit() {
    // Wait for scripts from index.html to load
    this.waitForScripts();
  }

  ngAfterViewInit() {
    // Wait for canvas and scripts
    this.waitForCanvasAndScripts();
  }

  private waitForScripts() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Check if scripts are already loaded
    if (typeof (window as any).THREE !== 'undefined' && typeof (window as any).TweenMax !== 'undefined') {
      return;
    }

    // Wait for DOM to be ready and scripts to load
    const checkScripts = () => {
      if (typeof (window as any).THREE !== 'undefined' && typeof (window as any).TweenMax !== 'undefined') {
        return;
      }

      // Wait for scripts from index.html to load
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max wait
      const checkInterval = setInterval(() => {
        attempts++;
        if (typeof (window as any).THREE !== 'undefined' && typeof (window as any).TweenMax !== 'undefined') {
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Scripts from index.html did not load, trying dynamic load');
          // Scripts didn't load from index.html, try loading dynamically
          this.loadScripts();
        }
      }, 100);
    };

    // Wait for document to be ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(checkScripts, 100);
    } else {
      window.addEventListener('load', checkScripts);
      document.addEventListener('DOMContentLoaded', checkScripts);
    }
  }

  private waitForCanvasAndScripts() {
    if (typeof window === 'undefined') return;

    const checkAndInit = () => {
      const THREE = (window as any).THREE;
      const hasCanvas = this.canvasRef && this.canvasRef.nativeElement;
      
      if (THREE && hasCanvas) {
        this.initScene();
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkAndInit()) {
      return;
    }

    // Wait with polling
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    const checkInterval = setInterval(() => {
      attempts++;
      if (checkAndInit()) {
        clearInterval(checkInterval);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('Timeout waiting for THREE.js or canvas. THREE available:', typeof (window as any).THREE !== 'undefined', 'Canvas available:', !!this.canvasRef);
        // Try one more time after a delay
        setTimeout(() => {
          if (typeof (window as any).THREE !== 'undefined' && this.canvasRef) {
            this.initScene();
          } else {
            // Last resort: try loading scripts dynamically
            this.loadScripts();
            setTimeout(() => {
              if (typeof (window as any).THREE !== 'undefined' && this.canvasRef) {
                this.initScene();
              }
            }, 1000);
          }
        }, 500);
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.resizeTm) {
      clearTimeout(this.resizeTm);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (typeof window !== 'undefined' && (window as any).TweenMax && (window as any).TweenMax.ticker) {
      (window as any).TweenMax.ticker.removeEventListener("tick", this.render);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
  }

  private loadScripts() {
    // Check if scripts are already loaded
    if (typeof window === 'undefined') return;

    if (typeof (window as any).THREE === 'undefined') {
      // Check if script tag already exists
      const existingScript = document.querySelector('script[src="/assets/js/three.min.js"]');
      if (existingScript) {
        // Script is in HTML but not loaded yet, wait for it
        existingScript.addEventListener('load', () => {
          if (typeof (window as any).TweenMax === 'undefined') {
            this.loadTweenMax();
          } else {
            setTimeout(() => this.initScene(), 200);
          }
        });
        return;
      }

      const threeScript = document.createElement('script');
      threeScript.src = '/assets/js/three.min.js';
      threeScript.onload = () => {
        if (typeof (window as any).TweenMax === 'undefined') {
          this.loadTweenMax();
        } else {
          setTimeout(() => this.initScene(), 200);
        }
      };
      threeScript.onerror = () => {
        console.error('Failed to load Three.js');
      };
      document.head.appendChild(threeScript);
    } else if (typeof (window as any).TweenMax === 'undefined') {
      this.loadTweenMax();
    } else {
      setTimeout(() => this.initScene(), 200);
    }
  }

  private loadTweenMax() {
    if (typeof window === 'undefined') return;

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src="/assets/js/TweenMax.min.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        setTimeout(() => this.initScene(), 200);
      });
      return;
    }

    const tweenScript = document.createElement('script');
    tweenScript.src = '/assets/js/TweenMax.min.js';
    tweenScript.onload = () => {
      setTimeout(() => this.initScene(), 200);
    };
    tweenScript.onerror = () => {
      console.error('Failed to load TweenMax');
      // Still try to init scene without TweenMax
      setTimeout(() => this.initScene(), 200);
    };
    document.head.appendChild(tweenScript);
  }

  private initScene() {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas || typeof window === 'undefined' || typeof (window as any).THREE === 'undefined') {
      console.warn('THREE.js not loaded yet');
      return;
    }

    const THREE = (window as any).THREE;

    // Initialize colors and mouse after THREE is loaded
    if (this.colors.length === 0) {
      this.colors = [
        new THREE.Color(0xac1122),
        new THREE.Color(0x96789f),
        new THREE.Color(0x535353)
      ];
    }

    if (!this.mouse) {
      this.mouse = new THREE.Vector2(-100, -100);
    }

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000);

    this.scene = new THREE.Scene();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 6;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    this.camera.position.set(0, 0, 350);

    this.galaxy = new THREE.Group();
    this.scene.add(this.galaxy);

    // Create dots
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "";
    const dotTexture = loader.load("/assets/img/dotTexture.png");
    const dotsAmount = 3000;
    
    // Store vertices for segments calculation
    const vertices: any[] = [];
    const positions = new Float32Array(dotsAmount * 3);
    const sizes = new Float32Array(dotsAmount);
    const colorsAttribute = new Float32Array(dotsAmount * 3);

    for (let i = 0; i < dotsAmount; i++) {
      const vector = new THREE.Vector3();

      (vector as any).color = Math.floor(Math.random() * this.colors.length);
      (vector as any).theta = Math.random() * Math.PI * 2;
      (vector as any).phi =
        (1 - Math.sqrt(Math.random())) *
        Math.PI /
        2 *
        (Math.random() > 0.5 ? 1 : -1);

      vector.x = Math.cos((vector as any).theta) * Math.cos((vector as any).phi);
      vector.y = Math.sin((vector as any).phi);
      vector.z = Math.sin((vector as any).theta) * Math.cos((vector as any).phi);
      vector.multiplyScalar(120 + (Math.random() - 0.5) * 5);
      (vector as any).scaleX = 5;
      (vector as any).index = i;

      if (Math.random() > 0.5) {
        this.moveDot(vector, i);
      }
      vertices.push(vector);
      vector.toArray(positions, i * 3);
      this.colors[(vector as any).color].toArray(colorsAttribute, i * 3);
      sizes[i] = 5;
    }

    // Store vertices for later use
    (this as any).vertices = vertices;

    const bufferWrapGeom = new THREE.BufferGeometry();
    this.attributePositions = new THREE.BufferAttribute(positions, 3);
    bufferWrapGeom.addAttribute('position', this.attributePositions);
    this.attributeSizes = new THREE.BufferAttribute(sizes, 1);
    bufferWrapGeom.addAttribute('size', this.attributeSizes);
    const attributeColors = new THREE.BufferAttribute(colorsAttribute, 3);
    bufferWrapGeom.addAttribute('color', attributeColors);

    const vertexShader = `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 350.0 / - mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      uniform sampler2D texture;
      void main(){
        vec4 textureColor = texture2D( texture, gl_PointCoord );
        if ( textureColor.a < 0.3 ) discard;
        vec4 color = vec4(vColor.xyz, 1.0) * textureColor;
        gl_FragColor = color;
      }
    `;

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        texture: {
          value: dotTexture
        }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true
    });

    this.wrap = new THREE.Points(bufferWrapGeom, shaderMaterial);
    this.scene.add(this.wrap);

    // Create white segments using BufferGeometry
    const segmentsPositions: number[] = [];
    const segmentsColors: number[] = [];
    const verticesArray = vertices;

    for (let i = verticesArray.length - 1; i >= 0; i--) {
      const vector = verticesArray[i];
      for (let j = verticesArray.length - 1; j >= 0; j--) {
        if (i !== j && vector.distanceTo(verticesArray[j]) < 12) {
          segmentsPositions.push(vector.x, vector.y, vector.z);
          segmentsPositions.push(verticesArray[j].x, verticesArray[j].y, verticesArray[j].z);
          const color = this.colors[(vector as any).color];
          segmentsColors.push(color.r, color.g, color.b);
          segmentsColors.push(color.r, color.g, color.b);
        }
      }
    }

    this.segmentsGeom = new THREE.BufferGeometry();
    this.segmentsGeom.addAttribute('position', new THREE.Float32BufferAttribute(segmentsPositions, 3));
    this.segmentsGeom.addAttribute('color', new THREE.Float32BufferAttribute(segmentsColors, 3));

    const segmentsMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      vertexColors: true
    });

    const segments = new THREE.LineSegments(this.segmentsGeom, segmentsMat);
    this.galaxy.add(segments);

    // Start render loop
    const TweenMax = (window as any).TweenMax;
    if (typeof TweenMax !== 'undefined' && TweenMax.ticker) {
      TweenMax.ticker.addEventListener("tick", this.render.bind(this));
    } else {
      this.animate();
    }

    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private moveDot(vector: any, index: number) {
    if (typeof window === 'undefined' || typeof (window as any).TweenMax === 'undefined') return;
    
    const TweenMax = (window as any).TweenMax;
    const Power0 = (window as any).Power0;
    const tempVector = vector.clone();
    tempVector.multiplyScalar((Math.random() - 0.5) * 0.2 + 1);
    TweenMax.to(vector, Math.random() * 3 + 3, {
      x: tempVector.x,
      y: tempVector.y,
      z: tempVector.z,
      yoyo: true,
      repeat: -1,
      delay: -Math.random() * 3,
      ease: Power0 ? Power0.easeNone : undefined,
      onUpdate: () => {
        this.attributePositions.array[index * 3] = vector.x;
        this.attributePositions.array[index * 3 + 1] = vector.y;
        this.attributePositions.array[index * 3 + 2] = vector.z;
      }
    });
  }

  private render = () => {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersections = this.raycaster.intersectObjects([this.wrap]);
    this.hovered = [];

    if (intersections.length) {
      for (let i = 0; i < intersections.length; i++) {
        const index = intersections[i].index;
        this.hovered.push(index);
        if (this.prevHovered.indexOf(index) === -1) {
          this.onDotHover(index);
        }
      }
    }

    for (let i = 0; i < this.prevHovered.length; i++) {
      if (this.hovered.indexOf(this.prevHovered[i]) === -1) {
        this.mouseOut(this.prevHovered[i]);
      }
    }

    this.prevHovered = this.hovered.slice(0);
    this.attributeSizes.needsUpdate = true;
    this.attributePositions.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.render();
  }

  private onDotHover(index: number) {
    const vertices = (this as any).vertices;
    if (!vertices || !vertices[index]) return;
    
    const vertex = vertices[index];
    if (typeof window !== 'undefined' && typeof (window as any).TimelineMax !== 'undefined') {
      const TimelineMax = (window as any).TimelineMax;
      const Elastic = (window as any).Elastic;
      (vertex as any).tl = new TimelineMax();
      (vertex as any).tl.to(vertex, 1, {
        scaleX: 10,
        ease: Elastic ? Elastic.easeOut.config(2, 0.2) : undefined,
        onUpdate: () => {
          this.attributeSizes.array[index] = (vertex as any).scaleX;
        }
      });
    } else {
      // Fallback animation
      (vertex as any).scaleX = 10;
      this.attributeSizes.array[index] = 10;
    }
  }

  private mouseOut(index: number) {
    const vertices = (this as any).vertices;
    if (!vertices || !vertices[index]) return;
    
    const vertex = vertices[index];
    if ((vertex as any).tl && typeof window !== 'undefined' && typeof (window as any).TimelineMax !== 'undefined') {
      const TimelineMax = (window as any).TimelineMax;
      const Power2 = (window as any).Power2;
      (vertex as any).tl.to(vertex, 0.4, {
        scaleX: 5,
        ease: Power2 ? Power2.easeOut : undefined,
        onUpdate: () => {
          this.attributeSizes.array[index] = (vertex as any).scaleX;
        }
      });
    } else {
      // Fallback animation
      (vertex as any).scaleX = 5;
      this.attributeSizes.array[index] = 5;
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const canvasBounding = canvas.getBoundingClientRect();
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    this.mouse.x = ((e.clientX - canvasBounding.left) / width) * 2 - 1;
    this.mouse.y = -((e.clientY - canvasBounding.top) / height) * 2 + 1;
  }

  private onResize = () => {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.resizeTm = clearTimeout(this.resizeTm);
    this.resizeTm = setTimeout(() => {
      canvas.style.width = '';
      canvas.style.height = '';
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (this.camera) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }
      if (this.renderer) {
        this.renderer.setSize(width, height);
      }
    }, 200);
  }
}


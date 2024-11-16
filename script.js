class CursorFlock {
    constructor(color, isLocal = false) {
        this.cursors = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.container = document.getElementById('cursor-container');
        this.maxCursors = 20;
        this.color = color;
        this.isLocal = isLocal;
        
        if (isLocal) {
            document.addEventListener('mousemove', (e) => {
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                // Broadcast position to other players
                broadcastUpdate({
                    mouseX: this.mouseX,
                    mouseY: this.mouseY
                });
            });

            // Create initial cursors for local player
            for (let i = 0; i < this.maxCursors; i++) {
                setTimeout(() => this.spawnCursor(), i * 100);
            }
        } else {
            // Create cursors for remote player
            for (let i = 0; i < this.maxCursors; i++) {
                setTimeout(() => this.spawnCursor(), i * 100);
            }
        }

        this.animate();
    }

    cleanup() {
        // Remove all cursors when a player disconnects
        this.cursors.forEach(cursor => {
            cursor.element.remove();
        });
        this.cursors = [];
    }

    updateFromServer(data) {
        // Update remote flock's target position
        this.mouseX = data.mouseX;
        this.mouseY = data.mouseY;
    }

    spawnCursor() {
        const element = document.createElement('div');
        element.className = 'cursor';
        // Apply player-specific color
        element.style.setProperty('--cursor-color', this.color);
        this.container.appendChild(element);

        const cursor = {
            element: element,
            x: Math.random() * window.innerWidth,
            y: -30,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2,
            rotation: 0,
            angularVelocity: 0,
            born: Date.now(),
            dead: false,
            fallen: false,
            bounceCount: 0,
            energy: 1
        };

        this.cursors.push(cursor);
        return cursor;
    }

    checkCollisions(cursor) {
        // Ground collision
        if (cursor.y > window.innerHeight - 10) {
            cursor.y = window.innerHeight - 10;
            
            if (Math.abs(cursor.vy) > 0.1) {
                cursor.vy *= -0.6 * cursor.energy;
                cursor.vx *= 0.8;
                cursor.angularVelocity = cursor.vx * 2;
                cursor.bounceCount++;
                cursor.energy *= 0.7;
            } else {
                cursor.vy = 0;
                cursor.angularVelocity *= 0.95;
                if (Math.abs(cursor.vx) < 0.1) {
                    cursor.fallen = true;
                    cursor.vx = 0;
                }
            }
        }

        // Wall collisions
        if (cursor.x < 0) {
            cursor.x = 0;
            cursor.vx *= -0.8;
        } else if (cursor.x > window.innerWidth - 10) {
            cursor.x = window.innerWidth - 10;
            cursor.vx *= -0.8;
        }

        // Collision with other cursors from the same flock
        this.cursors.forEach(other => {
            if (other !== cursor) {
                const dx = cursor.x - other.x;
                const dy = cursor.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 20 && cursor.y > other.y) {
                    cursor.y = other.y - 19;
                    if (cursor.vy > 0) {
                        cursor.vy *= -0.5 * cursor.energy;
                        cursor.vx += (dx / distance) * 0.5;
                        cursor.angularVelocity += (Math.random() - 0.5) * 5;
                    }
                }
            }
        });
    }

    updateCursor(cursor) {
        const age = Date.now() - cursor.born;
        
        if (!cursor.dead && age > 2000 + Math.random() * 3000) {
            cursor.dead = true;
            cursor.angularVelocity = (Math.random() - 0.5) * 15;
            cursor.vx += (Math.random() - 0.5) * 8;
        }

        if (cursor.dead) {
            cursor.vy += 0.8;
            cursor.vx *= 0.99;
            cursor.vy *= 0.99;
            
            cursor.x += cursor.vx;
            cursor.y += cursor.vy;
            
            cursor.rotation += cursor.angularVelocity;
            cursor.angularVelocity *= 0.98;

            this.checkCollisions(cursor);

            if (cursor.fallen && !cursor.spawnedReplacement && Math.abs(cursor.angularVelocity) < 0.1) {
                cursor.spawnedReplacement = true;
                setTimeout(() => this.spawnCursor(), 500);
            }
        } else {
            const dx = this.mouseX - cursor.x;
            const dy = this.mouseY - cursor.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const speed = 0.3;
                const randomness = 0.1;
                cursor.vx += (dx / dist) * speed + (Math.random() - 0.5) * randomness;
                cursor.vy += (dy / dist) * speed + (Math.random() - 0.5) * randomness;
            }

            const maxSpeed = 10;
            const currentSpeed = Math.sqrt(cursor.vx * cursor.vx + cursor.vy * cursor.vy);
            if (currentSpeed > maxSpeed) {
                cursor.vx = (cursor.vx / currentSpeed) * maxSpeed;
                cursor.vy = (cursor.vy / currentSpeed) * maxSpeed;
            }

            cursor.x += cursor.vx;
            cursor.y += cursor.vy;
            cursor.rotation = Math.atan2(cursor.vy, cursor.vx) * 180 / Math.PI + 90;
        }

        cursor.element.style.transform = `translate(${cursor.x}px, ${cursor.y}px) rotate(${cursor.rotation}deg)`;
        
        if (cursor.dead) {
            cursor.element.style.opacity = cursor.fallen ? 0.5 : 0.7;
        } else {
            cursor.element.style.opacity = '1';
        }
    }

    animate = () => {
        this.cursors.forEach(cursor => this.updateCursor(cursor));
        requestAnimationFrame(this.animate);
    }
}

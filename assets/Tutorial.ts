import { _decorator, Component, Node, Prefab, instantiate, tween, Vec3, v3, macro } from 'cc';
const { ccclass, property } = _decorator;
export enum HintType {
    START_GAME = 0,
    INACTIVITY = 1,
    MISSION_FAIL = 2,
    CUSTOM = 3
}

export interface TutorialTarget {
    node: Node;
    worldPosition: Vec3;
    isValid: boolean;
}

@ccclass('Tutorial')
export class Tutorial extends Component {
    
    private static instance: Tutorial = null!;
    
    @property(Prefab)
    private handPrefab: Prefab = null!;
    
    @property
    private inactivityDelay: number = 15;
    
    @property(Vec3)
    private handScale: Vec3 = new Vec3(1, 1, 1);
    
    @property(Vec3)
    private handOffset: Vec3 = new Vec3(0, 0, 0);
    
    @property
    private pressAnimationScale: number = 1.2;
    
    @property
    private pressAnimationDuration: number = 0.1;
    
    @property
    private moveSpeed: number = 0.5;

    @property(Node)
    private handParent: Node = null!; // Parent node for the hand
    
    private hand: Node = null!;
    private inactivityTime: number = 0;
    private isActive: boolean = false;
    private isReady: boolean = false;
    private inactivityCheck: any = null;
    
    // Events
    public static readonly HINT_START = 'hint-start';
    public static readonly HINT_END = 'hint-end';
    public static readonly PLAYER_INACTIVE = 'player-inactive';

    onLoad() {
        if (Tutorial.instance === null) {
            Tutorial.instance = this;
            console.log('Tutorial initialized');
        } else {
            this.destroy();
            return;
        }
    }
    
    start() {
        this.setup();
    }
    
    /**
     * Initialize the tutorial system
     * Call this method after setting up your game
     */
    public setup(): void {
        if (this.isReady) return;
        
        this.createHand();
        this.startInactivityCheck();
        this.isReady = true;
        
        console.log('Tutorial ready with hand scale:', this.handScale, 'and offset:', this.handOffset);
    }

    /**
     * Set custom targets for tutorial hints
     * @param targets Array of nodes or world positions to point at
     */
    public setCustomTargets(targets: (Node | Vec3)[]): void {
        // Store custom targets for later use
        this.node['_customTargets'] = targets;
    }

    /**
     * Show a custom hint with specific targets
     * @param targets Array of tutorial targets (nodes or positions)
     * @param hintType Type of hint (default: CUSTOM)
     */
    public showCustomHint(targets: TutorialTarget[], hintType: HintType = HintType.CUSTOM): void {
        if (this.isActive) return;
        
        console.log('Showing custom hint with', targets.length, 'targets');
        this.isActive = true;
        this.node.emit(Tutorial.HINT_START, hintType);
        
        this.playCustomHintAnimation(targets).then(() => {
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, hintType);
        }).catch((error) => {
            console.error('Custom hint error:', error);
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, hintType);
        });
    }

    /**
     * Show inactivity hint using predefined targets
     */
    public showInactivityHint(targets?: TutorialTarget[]): void {
        if (this.isActive) return;
        
        const hintTargets = targets || this.getDefaultTargets();
        if (hintTargets.length === 0) {
            console.warn('No targets available for inactivity hint');
            return;
        }
        
        console.log('Showing inactivity hint');
        this.isActive = true;
        this.node.emit(Tutorial.HINT_START, HintType.INACTIVITY);
        
        this.playHintAnimation(hintTargets).then(() => {
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, HintType.INACTIVITY);
        }).catch((error) => {
            console.error('Inactivity hint error:', error);
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, HintType.INACTIVITY);
        });
    }

    /**
     * Show start game hint
     */
    public showStartHint(targets?: TutorialTarget[]): void {
        if (this.isActive) return;
        
        const hintTargets = targets || this.getDefaultTargets();
        if (hintTargets.length === 0) {
            console.warn('No targets available for start hint');
            return;
        }
        
        console.log('Showing start hint');
        this.isActive = true;
        this.node.emit(Tutorial.HINT_START, HintType.START_GAME);
        
        this.playHintAnimation(hintTargets).then(() => {
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, HintType.START_GAME);
        }).catch((error) => {
            console.error('Start hint error:', error);
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END, HintType.START_GAME);
        });
    }

    private createHand(): void {
        if (!this.handPrefab) {
            console.warn('Hand prefab not assigned');
            return;
        }
        
        this.hand = instantiate(this.handPrefab);
        this.hand.parent = this.handParent || this.node;
        this.hand.active = false;
        this.hand.setScale(this.handScale);
        
        console.log('Tutorial hand created with scale:', this.handScale, 'and offset:', this.handOffset);
    }

    private getDefaultTargets(): TutorialTarget[] {
        // Override this method in your game to provide default targets
        // For example: return this.findMissionTargets();
        console.warn('No default targets implemented. Use setCustomTargets() or provide targets parameter.');
        return [];
    }

    private startInactivityCheck(): void {
        if (this.inactivityCheck) {
            this.unschedule(this.inactivityCheck);
        }
        
        this.inactivityTime = 0;
        this.inactivityCheck = this.schedule(this.checkInactivity.bind(this), 1, macro.REPEAT_FOREVER);
    }
    
    private checkInactivity(): void {
        if (this.isActive || !this.isReady) return;
        
        this.inactivityTime += 1;
        
        if (this.inactivityTime >= this.inactivityDelay) {
            console.log(`Player inactive for ${this.inactivityTime} seconds`);
            this.node.emit(Tutorial.PLAYER_INACTIVE);
            this.showInactivityHint();
            this.resetInactivityTimer();
        }
    }
    
    /**
     * Reset inactivity timer (call this when player interacts)
     */
    public resetInactivityTimer(): void {
        this.inactivityTime = 0;
    }

    private playHintAnimation(targets: TutorialTarget[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (targets.length < 1) {
                    reject('No valid targets provided');
                    return;
                }
                
                const hintTargets = targets.slice(0, 3); // Use up to 3 targets
                this.hand.active = true;
                await this.animateHandThroughTargets(hintTargets);
                this.hand.active = false;
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private playCustomHintAnimation(targets: TutorialTarget[]): Promise<void> {
        return this.playHintAnimation(targets);
    }

    private animateHandThroughTargets(targets: TutorialTarget[]): Promise<void> {
        return new Promise((resolve) => {
            if (!targets.length) {
                resolve();
                return;
            }
            
            let currentIndex = 0;
            
            const animateNextTarget = () => {
                if (currentIndex >= targets.length) {
                    resolve();
                    return;
                }
                
                const target = targets[currentIndex];
                if (!target.isValid) {
                    currentIndex++;
                    animateNextTarget();
                    return;
                }
                
                const worldPos = target.worldPosition;
                const targetPosition = new Vec3(
                    worldPos.x + this.handOffset.x,
                    worldPos.y + this.handOffset.y,
                    worldPos.z + this.handOffset.z
                );
                
                tween(this.hand)
                    .to(this.moveSpeed, { worldPosition: targetPosition })
                    .call(() => {
                        this.playPressAnimation().then(() => {
                            currentIndex++;
                            animateNextTarget();
                        });
                    })
                    .start();
            };
            
            const firstTarget = targets[0];
            if (!firstTarget.isValid) {
                resolve();
                return;
            }
            
            const firstPos = firstTarget.worldPosition;
            const firstTargetPos = new Vec3(
                firstPos.x + this.handOffset.x,
                firstPos.y + this.handOffset.y,
                firstPos.z + this.handOffset.z
            );
            
            this.hand.setWorldPosition(firstTargetPos);
            
            this.scheduleOnce(() => {
                animateNextTarget();
            }, 0.5);
        });
    }
    
    private playPressAnimation(): Promise<void> {
        return new Promise((resolve) => {
            const originalScale = this.handScale.clone();
            const pressedScale = new Vec3(
                originalScale.x * this.pressAnimationScale,
                originalScale.y * this.pressAnimationScale,
                originalScale.z
            );
            
            tween(this.hand)
                .to(this.pressAnimationDuration, { scale: pressedScale })
                .to(this.pressAnimationDuration, { scale: originalScale })
                .delay(0.3)
                .call(() => resolve())
                .start();
        });
    }

    /**
     * Show hint with specified type
     * @param hintType Type of hint to show
     * @param targets Optional custom targets
     */
    public showHint(hintType: HintType = HintType.INACTIVITY, targets?: TutorialTarget[]): void {
        if (this.isActive) return;
        
        switch (hintType) {
            case HintType.START_GAME:
                this.showStartHint(targets);
                break;
            case HintType.INACTIVITY:
                this.showInactivityHint(targets);
                break;
            case HintType.CUSTOM:
                this.showCustomHint(targets || []);
                break;
            default:
                console.warn(`Hint type ${hintType} not implemented`);
        }
    }

    /**
     * Check if tutorial is currently showing a hint
     */
    public isShowingHint(): boolean {
        return this.isActive;
    }
    
    /**
     * Set inactivity delay in seconds
     */
    public setInactivityDelay(seconds: number): void {
        this.inactivityDelay = seconds;
        this.resetInactivityTimer();
    }

    /**
     * Set hand scale
     */
    public setHandScale(scale: Vec3): void {
        this.handScale = scale;
        if (this.hand) {
            this.hand.setScale(scale);
        }
    }
    
    /**
     * Set uniform hand scale
     */
    public setHandScaleUniform(scale: number): void {
        this.setHandScale(new Vec3(scale, scale, scale));
    }
    
    /**
     * Get current hand scale
     */
    public getHandScale(): Vec3 {
        return this.handScale.clone();
    }

    /**
     * Set hand offset relative to target positions
     */
    public setHandOffset(offset: Vec3): void {
        this.handOffset = offset;
        console.log('Hand offset updated to:', offset);
    }
    
    /**
     * Set hand offset using X and Y coordinates
     */
    public setHandOffsetXY(x: number, y: number): void {
        this.handOffset = new Vec3(x, y, this.handOffset.z);
        console.log('Hand offset updated to:', this.handOffset);
    }
    
    /**
     * Get current hand offset
     */
    public getHandOffset(): Vec3 {
        return this.handOffset.clone();
    }
    
    /**
     * Set press animation scale
     */
    public setPressAnimationScale(scale: number): void {
        this.pressAnimationScale = scale;
    }
    
    /**
     * Set hand movement speed
     */
    public setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
    }
    
    /**
     * Get tutorial instance
     */
    public static get(): Tutorial {
        return Tutorial.instance;
    }
    
    /**
     * Stop current tutorial animation
     */
    public stop(): void {
        if (this.isActive) {
            tween(this.hand).stop();
            if (this.hand) {
                this.hand.active = false;
            }
            this.isActive = false;
            this.node.emit(Tutorial.HINT_END);
        }
    }
    
    /**
     * Test hand position at specific target
     * @param target Target to test hand position
     */
    public testHandPosition(target: TutorialTarget): void {
        if (!this.hand || !target.isValid) return;
        
        const worldPos = target.worldPosition;
        const targetPosition = new Vec3(
            worldPos.x + this.handOffset.x,
            worldPos.y + this.handOffset.y,
            worldPos.z + this.handOffset.z
        );
        
        this.hand.active = true;
        this.hand.setWorldPosition(targetPosition);
        
        console.log('Hand position test:', {
            targetPosition: worldPos,
            handOffset: this.handOffset,
            finalPosition: targetPosition
        });
    }
    
    protected onDestroy(): void {
        if (Tutorial.instance === this) {
            Tutorial.instance = null!;
        }
        
        if (this.inactivityCheck) {
            this.unschedule(this.inactivityCheck);
        }
        
        if (this.hand) {
            this.hand.destroy();
        }
    }
}

// Helper function to create tutorial targets from nodes
export function createTargetsFromNodes(nodes: Node[]): TutorialTarget[] {
    return nodes.map(node => ({
        node: node,
        worldPosition: node.worldPosition,
        isValid: node && node.isValid
    }));
}

// Helper function to create tutorial targets from positions
export function createTargetsFromPositions(positions: Vec3[]): TutorialTarget[] {
    return positions.map(position => ({
        node: null!,
        worldPosition: position,
        isValid: true
    }));
}



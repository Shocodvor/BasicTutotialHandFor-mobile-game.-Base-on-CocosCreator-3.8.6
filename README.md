Copy the module files to your project:

Tutorial.ts - Main tutorial component

(Optional) Create a hand prefab for visual guidance

Add tutorial to your scene:

typescript
// Create tutorial node
const tutorialNode = new Node('Tutorial');
const tutorial = tutorialNode.addComponent(Tutorial);
Configure in Inspector or via code:

Assign hand prefab

Set hand parent (optional)

Adjust timing and animation parameters

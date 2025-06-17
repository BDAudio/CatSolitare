// Cat Solitaire Game Logic
class Card {
    constructor(value, catType) {
        this.value = value;
        this.catType = catType;
        this.faceUp = false;
        this.element = null;
    }
    
    flip() {
        this.faceUp = !this.faceUp;
        if (this.element) {
            this.element.classList.toggle('face-down', !this.faceUp);
            this.updateCardDisplay();
        }
    }
    
    getValueString() {
        const valueMap = {1: "A", 11: "J", 12: "Q", 13: "K"};
        return valueMap[this.value] || String(this.value);
    }
    
    getColor() {
        // Cat types: 🐈 (Tabby), 🐈‍⬛ (Black), 😺 (Orange), 😻 (Calico)
        const colorGroup1 = ["🐈", "🐈‍⬛"];
        const colorGroup2 = ["😺", "😻"];
        
        return colorGroup1.includes(this.catType) ? "group1" : "group2";
    }
    
    createCardElement() {
        const card = document.createElement('div');
        card.className = 'card';
        if (!this.faceUp) {
            card.classList.add('face-down');
        }
        
        if (this.faceUp) {
            this.updateCardDisplay(card);
        }
        
        // Make sure the card is clickable
        card.style.cursor = 'pointer';
        
        this.element = card;
        return card;
    }
    
    updateCardDisplay(cardElement = null) {
        const card = cardElement || this.element;
        if (!card || !this.faceUp) return;
        
        card.innerHTML = '';
        
        const valueStr = this.getValueString();
        const catType = this.catType;
        
        // Card color based on cat type
        const textColor = this.getColor() === "group1" ? "#000000" : "#d35400";
        card.style.color = textColor;
        
        // Top section
        const topSection = document.createElement('div');
        topSection.className = 'card-top';
        topSection.innerHTML = `<span>${valueStr}</span><span>${catType}</span>`;
        topSection.style.pointerEvents = 'none'; // Prevent child elements from capturing clicks
        
        // Center section
        const centerSection = document.createElement('div');
        centerSection.className = 'card-center';
        centerSection.textContent = catType;
        centerSection.style.pointerEvents = 'none'; // Prevent child elements from capturing clicks
        
        // Bottom section
        const bottomSection = document.createElement('div');
        bottomSection.className = 'card-bottom';
        bottomSection.innerHTML = `<span>${catType}</span><span>${valueStr}</span>`;
        bottomSection.style.pointerEvents = 'none'; // Prevent child elements from capturing clicks
        
        card.appendChild(topSection);
        card.appendChild(centerSection);
        card.appendChild(bottomSection);
    }
}

class CatSolitaire {
    constructor() {
        this.tableau = Array(7).fill().map(() => []);
        this.foundations = Array(4).fill().map(() => []);
        this.stock = [];
        this.waste = [];
        this.catTypes = ["🐈", "🐈‍⬛", "😺", "😻"];
        this.startTime = new Date();
        this.wasteCycles = 0;
        this.maxWasteCycles = 20;
        this.timer = null;
        this.moveHistory = [];
        this.selectedCard = null;
        this.selectedPile = null;
        this.selectedIndex = -1;
        
        // Drag and drop related properties
        this.dragCards = null;
        this.dragOverlay = null;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragOffsetX = null;
        this.dragOffsetY = null;
        
        this.setupGame();
        this.setupEventListeners();
        this.startTimer();
    }
    
    setupGame() {
        // Create deck
        const deck = [];
        for (const cat of this.catTypes) {
            for (let value = 1; value <= 13; value++) {
                deck.push(new Card(value, cat));
            }
        }
        
        // Shuffle deck
        this.shuffle(deck);
        
        // Deal to tableau
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = deck.pop();
                if (i === j) { // Last card in each pile is face up
                    card.faceUp = true;
                }
                this.tableau[j].push(card);
            }
        }
        
        // Remaining cards go to stock
        this.stock = deck;
        
        // Render the initial game state
        this.renderGame();
    }
    
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    startTimer() {
        this.startTime = new Date();
        this.timer = setInterval(() => {
            const elapsed = new Date() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.querySelector('.timer').textContent = 
                `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        clearInterval(this.timer);
    }
    
    setupEventListeners() {
        // Add a click handler to debug card clicks
        document.addEventListener('click', (e) => {
            console.log('Click detected on:', e.target);
            const card = e.target.closest('.card');
            if (card) {
                console.log('Card clicked:', card);
            }
        });
        
        // Stock pile click
        document.getElementById('stock').addEventListener('click', () => this.drawCard());
        
        // New game button
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        
        // Undo button
        document.getElementById('undo').addEventListener('click', () => this.undoMove());
        
        // Rules button
        document.getElementById('rules').addEventListener('click', () => {
            document.getElementById('rules-modal').style.display = 'flex';
        });
        
        // Close rules button
        document.getElementById('close-rules').addEventListener('click', () => {
            document.getElementById('rules-modal').style.display = 'none';
        });
        
        // Play again buttons
        document.getElementById('play-again').addEventListener('click', () => {
            document.getElementById('win-modal').style.display = 'none';
            this.newGame();
        });
        
        document.getElementById('try-again').addEventListener('click', () => {
            document.getElementById('lose-modal').style.display = 'none';
            this.newGame();
        });
        
        // Waste pile click (double click to move to foundation)
        document.getElementById('waste').addEventListener('dblclick', () => {
            if (this.waste.length > 0) {
                this.moveToFoundation('waste');
            }
        });
        
        // Foundation piles
        for (let i = 0; i < 4; i++) {
            const foundation = document.getElementById(`foundation-${i}`);
            
            foundation.addEventListener('click', () => {
                if (this.selectedCard && this.selectedPile) {
                    if (this.selectedPile === 'waste') {
                        this.moveToFoundation('waste');
                    } else if (this.selectedPile.startsWith('tableau-')) {
                        const tableauIndex = parseInt(this.selectedPile.split('-')[1]);
                        this.moveToFoundation(tableauIndex);
                    }
                    this.clearSelection();
                }
            });
        }
        
        // Tableau piles
        for (let i = 0; i < 7; i++) {
            const tableauPile = document.getElementById(`tableau-${i}`);
            
            // Double click to move to foundation
            tableauPile.addEventListener('dblclick', (e) => {
                if (e.target.classList.contains('card') && !e.target.classList.contains('face-down')) {
                    const cardElement = e.target.closest('.card');
                    const cards = Array.from(tableauPile.querySelectorAll('.card'));
                    const cardIndex = cards.indexOf(cardElement);
                    
                    if (cardIndex === cards.length - 1) {
                        this.moveToFoundation(i);
                    }
                }
            });
        }
        
        // Setup drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        // Use direct event listeners on the document for better reliability
        document.addEventListener('mousedown', this.handleDragStart.bind(this), true);
        document.addEventListener('mousemove', this.handleDragMove.bind(this), true);
        document.addEventListener('mouseup', this.handleDragEnd.bind(this), true);
        
        // Prevent default drag behavior on cards
        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.card')) {
                e.preventDefault();
            }
        }, true);
    }
    
    handleDragStart(e) {
        // Check if we clicked on a card or any of its child elements
        const card = e.target.closest('.card');
        if (!card || card.classList.contains('face-down')) {
            return;
        }
        
        const pile = card.closest('.pile');
        
        if (!pile) return;
        
        // Clear any previous selection
        this.clearSelection();
        
        // Set the selected card and pile
        this.selectedCard = card;
        this.selectedPile = pile.id;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // Store the original position for animation
        const rect = card.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
        
        // If it's a tableau pile, we need to get the index of the card and all cards on top
        if (pile.id.startsWith('tableau-')) {
            const cards = Array.from(pile.querySelectorAll('.card'));
            this.selectedIndex = cards.indexOf(card);
            
            // Get all cards that should move together
            this.dragCards = cards.slice(this.selectedIndex);
            
            // Create a drag overlay for all cards being dragged
            this.createDragOverlay(e);
        } else {
            // For waste and foundation, only drag the top card
            this.dragCards = [card];
            
            // Create a drag overlay for the single card
            this.createDragOverlay(e);
        }
        
        // Add a visual indicator that the card is selected
        card.classList.add('selected');
    }
    
    createDragOverlay(e) {
        // Create a container for the overlay cards
        const overlay = document.createElement('div');
        overlay.className = 'drag-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = `${e.clientX - this.dragOffsetX}px`;
        overlay.style.top = `${e.clientY - this.dragOffsetY}px`;
        overlay.style.zIndex = 9999; // Ensure it's above everything
        overlay.style.pointerEvents = 'none'; // Don't interfere with mouse events
        
        // Clone each card in the stack
        this.dragCards.forEach((card, i) => {
            const clone = card.cloneNode(true);
            clone.style.position = 'absolute';
            clone.style.top = `${i * 25}px`; // Stack the cards
            clone.style.left = '0';
            clone.style.margin = '0';
            clone.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.5)'; // Add shadow for depth
            overlay.appendChild(clone);
            
            // Hide the original card
            card.style.opacity = '0.3';
        });
        
        document.body.appendChild(overlay);
        this.dragOverlay = overlay;
    }
    
    handleDragMove(e) {
        if (!this.selectedCard || !this.dragOverlay) return;
        
        // Move the overlay with the mouse
        this.dragOverlay.style.left = `${e.clientX - this.dragOffsetX}px`;
        this.dragOverlay.style.top = `${e.clientY - this.dragOffsetY}px`;
    }
    
    handleDragEnd(e) {
        if (!this.selectedCard) return;
        
        // Find the target pile
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetPile = targetElement ? targetElement.closest('.pile') : null;
        
        // Clean up drag overlay
        if (this.dragOverlay) {
            document.body.removeChild(this.dragOverlay);
            this.dragOverlay = null;
        }
        
        // Restore original card opacity
        if (this.dragCards) {
            this.dragCards.forEach(card => {
                card.style.opacity = '';
            });
        }
        
        // Process the move if dropped on a valid target
        if (targetPile && targetPile.id !== this.selectedPile) {
            // Handle the move based on source and target
            if (this.selectedPile === 'waste') {
                if (targetPile.id.startsWith('foundation-')) {
                    this.moveToFoundation('waste');
                } else if (targetPile.id.startsWith('tableau-')) {
                    const tableauIndex = parseInt(targetPile.id.split('-')[1]);
                    this.moveWasteToTableau(tableauIndex);
                }
            } else if (this.selectedPile.startsWith('tableau-')) {
                const fromIndex = parseInt(this.selectedPile.split('-')[1]);
                
                if (targetPile.id.startsWith('foundation-')) {
                    this.moveToFoundation(fromIndex);
                } else if (targetPile.id.startsWith('tableau-')) {
                    const toIndex = parseInt(targetPile.id.split('-')[1]);
                    this.moveTableauToTableau(fromIndex, toIndex, this.selectedIndex);
                }
            }
        }
        
        this.clearSelection();
    }
    
    clearSelection() {
        if (this.selectedCard) {
            this.selectedCard.classList.remove('selected');
        }
        
        // Clean up any dragging cards
        if (this.dragCards) {
            this.dragCards.forEach(card => {
                card.classList.remove('dragging', 'selected');
                card.style.opacity = '';
                card.style.zIndex = '';
            });
            this.dragCards = null;
        }
        
        // Remove drag overlay
        if (this.dragOverlay) {
            document.body.removeChild(this.dragOverlay);
            this.dragOverlay = null;
        }
        
        this.selectedCard = null;
        this.selectedPile = null;
        this.selectedIndex = -1;
        this.dragStartX = null;
        this.dragStartY = null;
        this.dragOffsetX = null;
        this.dragOffsetY = null;
    }
    
    drawCard() {
        if (this.stock.length === 0) {
            // Reset stock from waste if empty
            if (this.wasteCycles >= this.maxWasteCycles) {
                this.checkGameLost();
                return;
            }
            
            this.saveMove({
                type: 'reset-stock',
                wasteCycles: this.wasteCycles,
                waste: [...this.waste]
            });
            
            this.wasteCycles++;
            this.stock = [...this.waste].reverse();
            this.waste = [];
            
            for (const card of this.stock) {
                card.faceUp = false;
            }
            
            document.querySelector('.cycles').textContent = `Cycles: ${this.wasteCycles}/${this.maxWasteCycles}`;
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
            
            this.saveMove({
                type: 'draw',
                card: this.waste.length - 1
            });
        }
        
        this.renderStock();
        this.renderWaste();
    }
    
    canMoveToFoundation(card) {
        if (!card || !card.faceUp) {
            return false;
        }
        
        const foundationIdx = this.catTypes.indexOf(card.catType);
        const foundation = this.foundations[foundationIdx];
        
        if (foundation.length === 0 && card.value === 1) { // Empty foundation accepts only Ace
            return true;
        } else if (foundation.length > 0 && card.value === foundation[foundation.length - 1].value + 1) {
            return true;
        }
        return false;
    }
    
    canMoveToTableau(card, tableauIdx) {
        if (!card || !card.faceUp) {
            return false;
        }
        
        const targetPile = this.tableau[tableauIdx];
        
        if (targetPile.length === 0 && card.value === 13) { // Empty tableau accepts only King
            return true;
        } else if (targetPile.length > 0 && targetPile[targetPile.length - 1].faceUp) {
            const topCard = targetPile[targetPile.length - 1];
            
            // Different color groups and descending value
            return card.getColor() !== topCard.getColor() && topCard.value === card.value + 1;
        }
        return false;
    }
    
    moveToFoundation(source) {
        // Source can be 'waste' or tableau index
        let moved = false;
        
        if (source === 'waste' && this.waste.length > 0) {
            const card = this.waste[this.waste.length - 1];
            if (this.canMoveToFoundation(card)) {
                const foundationIdx = this.catTypes.indexOf(card.catType);
                
                this.saveMove({
                    type: 'waste-to-foundation',
                    card: card,
                    foundationIdx: foundationIdx
                });
                
                this.foundations[foundationIdx].push(this.waste.pop());
                moved = true;
            }
        } else if (typeof source === 'number' && source >= 0 && source < 7) {
            const tableauPile = this.tableau[source];
            if (tableauPile.length > 0) {
                const card = tableauPile[tableauPile.length - 1];
                if (card.faceUp && this.canMoveToFoundation(card)) {
                    const foundationIdx = this.catTypes.indexOf(card.catType);
                    
                    this.saveMove({
                        type: 'tableau-to-foundation',
                        tableauIdx: source,
                        card: card,
                        foundationIdx: foundationIdx,
                        revealedCard: tableauPile.length > 1 ? !tableauPile[tableauPile.length - 2].faceUp : false
                    });
                    
                    this.foundations[foundationIdx].push(tableauPile.pop());
                    
                    // Flip the new top card if needed
                    if (tableauPile.length > 0 && !tableauPile[tableauPile.length - 1].faceUp) {
                        tableauPile[tableauPile.length - 1].flip();
                    }
                    moved = true;
                }
            }
        }
        
        if (moved) {
            this.renderGame();
            this.checkGameWon();
        }
        
        return moved;
    }
    
    moveTableauToTableau(fromIdx, toIdx, cardIdx = null) {
        if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= 7 || toIdx < 0 || toIdx >= 7) {
            return false;
        }
        
        const fromPile = this.tableau[fromIdx];
        
        if (fromPile.length === 0) {
            return false;
        }
        
        // If cardIdx is null, try to move the last card
        if (cardIdx === null) {
            cardIdx = fromPile.length - 1;
        }
        
        if (cardIdx < 0 || cardIdx >= fromPile.length || !fromPile[cardIdx].faceUp) {
            return false;
        }
        
        // Check if we can move the card and all cards on top of it
        const card = fromPile[cardIdx];
        if (this.canMoveToTableau(card, toIdx)) {
            // Save the move for undo
            this.saveMove({
                type: 'tableau-to-tableau',
                fromIdx: fromIdx,
                toIdx: toIdx,
                cardIdx: cardIdx,
                cards: fromPile.slice(cardIdx),
                revealedCard: cardIdx > 0 ? !fromPile[cardIdx - 1].faceUp : false
            });
            
            // Move the card and all cards on top of it
            const cardsToMove = fromPile.splice(cardIdx);
            this.tableau[toIdx].push(...cardsToMove);
            
            // Flip the new top card if needed
            if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
                fromPile[fromPile.length - 1].flip();
            }
            
            this.renderTableau();
            return true;
        }
        return false;
    }
    
    moveWasteToTableau(tableauIdx) {
        if (this.waste.length === 0) {
            return false;
        }
        
        const card = this.waste[this.waste.length - 1];
        if (this.canMoveToTableau(card, tableauIdx)) {
            this.saveMove({
                type: 'waste-to-tableau',
                tableauIdx: tableauIdx,
                card: card
            });
            
            this.tableau[tableauIdx].push(this.waste.pop());
            this.renderWaste();
            this.renderTableau();
            return true;
        }
        return false;
    }
    
    saveMove(move) {
        this.moveHistory.push(move);
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) {
            return;
        }
        
        const lastMove = this.moveHistory.pop();
        
        switch (lastMove.type) {
            case 'draw':
                const card = this.waste.pop();
                card.faceUp = false;
                this.stock.push(card);
                break;
                
            case 'reset-stock':
                this.wasteCycles = lastMove.wasteCycles;
                this.waste = lastMove.waste;
                this.stock = [];
                document.querySelector('.cycles').textContent = `Cycles: ${this.wasteCycles}/${this.maxWasteCycles}`;
                break;
                
            case 'waste-to-foundation':
                const wasteCard = this.foundations[lastMove.foundationIdx].pop();
                this.waste.push(wasteCard);
                break;
                
            case 'tableau-to-foundation':
                const tableauCard = this.foundations[lastMove.foundationIdx].pop();
                this.tableau[lastMove.tableauIdx].push(tableauCard);
                
                // If a card was revealed, flip it back
                if (lastMove.revealedCard) {
                    this.tableau[lastMove.tableauIdx][this.tableau[lastMove.tableauIdx].length - 2].flip();
                }
                break;
                
            case 'tableau-to-tableau':
                // Move cards back
                const movedCards = this.tableau[lastMove.toIdx].splice(-lastMove.cards.length);
                this.tableau[lastMove.fromIdx].push(...movedCards);
                
                // If a card was revealed, flip it back
                if (lastMove.revealedCard) {
                    this.tableau[lastMove.fromIdx][lastMove.cardIdx - 1].flip();
                }
                break;
                
            case 'waste-to-tableau':
                const movedCard = this.tableau[lastMove.tableauIdx].pop();
                this.waste.push(movedCard);
                break;
        }
        
        this.renderGame();
    }
    
    isGameWon() {
        // Check if all foundations have 13 cards (A through K)
        return this.foundations.every(foundation => foundation.length === 13);
    }
    
    checkGameWon() {
        if (this.isGameWon()) {
            this.stopTimer();
            
            // Calculate elapsed time
            const elapsed = new Date() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            document.getElementById('win-time').textContent = timeStr;
            document.getElementById('win-modal').style.display = 'flex';
        }
    }
    
    isGameLost() {
        // Game is lost if we've used all waste cycles and no more valid moves
        if (this.wasteCycles >= this.maxWasteCycles && this.stock.length === 0) {
            // Check if any cards can be moved to foundation
            if (this.waste.length > 0 && this.canMoveToFoundation(this.waste[this.waste.length - 1])) {
                return false;
            }
            
            for (let i = 0; i < 7; i++) {
                if (this.tableau[i].length > 0 && 
                    this.canMoveToFoundation(this.tableau[i][this.tableau[i].length - 1])) {
                    return false;
                }
            }
            
            // Check if any tableau cards can be moved to other tableau columns
            for (let i = 0; i < 7; i++) {
                if (this.tableau[i].length === 0) continue;
                
                const topCard = this.tableau[i][this.tableau[i].length - 1];
                if (!topCard.faceUp) continue;
                
                for (let j = 0; j < 7; j++) {
                    if (i === j) continue;
                    if (this.canMoveToTableau(topCard, j)) {
                        return false;
                    }
                }
                
                // Check if we can move sequences of cards
                for (let cardIdx = 0; cardIdx < this.tableau[i].length; cardIdx++) {
                    if (!this.tableau[i][cardIdx].faceUp) continue;
                    
                    for (let j = 0; j < 7; j++) {
                        if (i === j) continue;
                        if (this.canMoveToTableau(this.tableau[i][cardIdx], j)) {
                            return false;
                        }
                    }
                }
            }
            
            // No valid moves left
            return true;
        }
        return false;
    }
    
    checkGameLost() {
        if (this.isGameLost()) {
            this.stopTimer();
            document.getElementById('lose-modal').style.display = 'flex';
        }
    }
    
    newGame() {
        this.stopTimer();
        this.tableau = Array(7).fill().map(() => []);
        this.foundations = Array(4).fill().map(() => []);
        this.stock = [];
        this.waste = [];
        this.wasteCycles = 0;
        this.moveHistory = [];
        this.setupGame();
        this.startTimer();
    }
    
    renderGame() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableau();
    }
    
    renderStock() {
        const stockElement = document.getElementById('stock');
        stockElement.innerHTML = '';
        
        if (this.stock.length > 0) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card face-down';
            stockElement.appendChild(cardBack);
        } else {
            // Show empty stock indicator
            const emptyIndicator = document.createElement('div');
            emptyIndicator.className = 'empty-stock';
            emptyIndicator.textContent = '🐾';
            emptyIndicator.style.fontSize = '2em';
            emptyIndicator.style.opacity = '0.5';
            stockElement.appendChild(emptyIndicator);
        }
    }
    
    renderWaste() {
        const wasteElement = document.getElementById('waste');
        wasteElement.innerHTML = '';
        
        if (this.waste.length > 0) {
            const topCard = this.waste[this.waste.length - 1];
            const cardElement = topCard.createCardElement();
            
            // Add a specific click handler to this card
            cardElement.addEventListener('mousedown', (e) => {
                console.log(`Waste card clicked: ${topCard.getValueString()} of ${topCard.catType}`);
                // Prevent event from bubbling to parent elements
                e.stopPropagation();
            });
            
            wasteElement.appendChild(cardElement);
        } else {
            // Show empty waste indicator
            const emptyIndicator = document.createElement('div');
            emptyIndicator.className = 'empty-waste';
            emptyIndicator.textContent = '🐾';
            emptyIndicator.style.fontSize = '2em';
            emptyIndicator.style.opacity = '0.5';
            wasteElement.appendChild(emptyIndicator);
        }
    }
    
    renderFoundations() {
        for (let i = 0; i < 4; i++) {
            const foundationElement = document.getElementById(`foundation-${i}`);
            foundationElement.innerHTML = '';
            
            const foundation = this.foundations[i];
            if (foundation.length > 0) {
                const topCard = foundation[foundation.length - 1];
                const cardElement = topCard.createCardElement();
                
                // Add a specific click handler to this card
                cardElement.addEventListener('mousedown', (e) => {
                    console.log(`Foundation card clicked: ${topCard.getValueString()} of ${topCard.catType}`);
                    // Prevent event from bubbling to parent elements
                    e.stopPropagation();
                });
                
                foundationElement.appendChild(cardElement);
            } else {
                // Show empty foundation with cat type
                const catType = this.catTypes[i];
                const emptyIndicator = document.createElement('div');
                emptyIndicator.className = 'empty-foundation';
                emptyIndicator.textContent = catType;
                emptyIndicator.style.fontSize = '2em';
                emptyIndicator.style.opacity = '0.5';
                foundationElement.appendChild(emptyIndicator);
            }
        }
    }
    
    renderTableau() {
        for (let i = 0; i < 7; i++) {
            const tableauElement = document.getElementById(`tableau-${i}`);
            tableauElement.innerHTML = '';
            
            const pile = this.tableau[i];
            if (pile.length === 0) continue;
            
            // Create a container for the cards to ensure proper event bubbling
            const pileContainer = document.createElement('div');
            pileContainer.className = 'pile-container';
            pileContainer.style.position = 'relative';
            pileContainer.style.width = '100%';
            pileContainer.style.height = '100%';
            tableauElement.appendChild(pileContainer);
            
            for (let j = 0; j < pile.length; j++) {
                const card = pile[j];
                const cardElement = card.createCardElement();
                cardElement.style.top = `${j * 25}px`;
                cardElement.style.position = 'absolute'; // Ensure absolute positioning
                cardElement.style.left = '10px'; // Center in the pile
                
                // Add data attributes to help with debugging
                cardElement.dataset.pileIndex = i;
                cardElement.dataset.cardIndex = j;
                cardElement.dataset.value = card.value;
                cardElement.dataset.catType = card.catType;
                
                // Add a specific click handler to this card
                cardElement.addEventListener('mousedown', (e) => {
                    console.log(`Card clicked: ${card.getValueString()} of ${card.catType}`);
                    // Prevent event from bubbling to parent elements
                    e.stopPropagation();
                });
                
                pileContainer.appendChild(cardElement);
            }
        }
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new CatSolitaire();
    
    // Add a test function to verify card clickability
    window.testCardClicks = function() {
        console.log("Testing card clicks...");
        const cards = document.querySelectorAll('.card');
        console.log(`Found ${cards.length} cards`);
        
        cards.forEach((card, i) => {
            console.log(`Card ${i}:`, card);
            // Add a temporary highlight to each card
            setTimeout(() => {
                card.style.boxShadow = '0 0 10px 5px gold';
                setTimeout(() => {
                    card.style.boxShadow = '';
                }, 500);
            }, i * 600);
        });
    };
    
    // Run the test after a short delay to ensure the game is rendered
    setTimeout(() => {
        window.testCardClicks();
    }, 1000);
});

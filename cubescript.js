"use strict";
var pop_size = 10000;
var num_survivors = 200; // at most half of pop_size
var max_phase4_generations = 10;
var g3_criteria_weight = 5;
var g4_criteria_weight = 3;
var size_weight = 1;

var selections = new Array(1000000);
var selection_probabilities = new Array(num_survivors);
window.onload = function() {
    var ratio = (num_survivors - 1) / num_survivors;
    var prob = (1 / num_survivors) / (1 - Math.pow(ratio, num_survivors));
    selection_probabilities[0] = prob;
    for (var i = 1; i < num_survivors - 1; i++) {
        prob *= ratio;
        selection_probabilities[i] = selection_probabilities[i - 1] + prob;
    }
    selection_probabilities[num_survivors - 1] = 1;
    for (var i = selections.length; i--;)  {
        for (var r = Math.random(), j = 0;; j++) {
            if (r <= selection_probabilities[j]) {
                selections[i] = j; break;
            }
        }
    }
    document.getElementById("hello").innerHTML = "<p>Would you like to input"
        + " your own cube or solve a random cube?</p>"
        + '<input type="button" onclick="set(false)" value="Own Cube"/>'
        + ' <input type="button" onclick="set(true)" value="Random Cube"/>';
}

var ind = -1;
function select() {
    return ++ind >= selections.length ? selections[ind = 0] : selections[ind];
}

var move_strs = ["L", "L2", "L'", "R", "R2", "R'", "F", "F2", "F'",
                 "B", "B2", "B'", "U", "U2", "U'", "D", "D2", "D'"];
var movegroup_of_phase = [[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
                          [1,4,6,7,8,9,10,11,12,13,14,15,16,17],
                          [1,4,6,7,8,9,10,11,12,13,14,15,16,17],
                          [1,4,7,10,12,13,14,15,16,17],
                          [1,4,7,10,13,16], [7,10,13,16], [13,16]];
var max_moves = [6, 6, 14, 16, 18, 18, 2];
var g0_weight = 10; var g1a_weight = 10; var g1b_weight = 40;
var g2_weight = 5; var g3_weight = 15; var g4_weight = 5; var g5_weight = 5;

function Cube() {
    this.left = new Array(8); this.right = new Array(8);
    this.front = new Array(8); this.back = new Array(8);
    this.up = new Array(8); this.down = new Array(8);
    this.start = null; this.fitness = 0; this.fitness_without_size = 0;

    this.copy = function(other) {
        for (var i = 8; i--;) {
            this.left[i] = other.left[i]; this.right[i] = other.right[i];
            this.front[i] = other.front[i]; this.back[i] = other.back[i];
            this.up[i] = other.up[i]; this.down[i] = other.down[i];
        }
        this.start = other.start; this.fitness = other.fitness;
        this.fitness_without_size = other.fitness_without_size;
    }

    this.size = function() {
        var current = this.start;
        this.start = { id: null, next: this.start };
        var previous = this.start;
        var size = 0;
        while (!size) {
            size = 1;
            while (current !== null && current.next !== null) {
                if (current.id / 3 >> 0 == current.next.id / 3 >> 0) {
                    size = 0;
                    var current_mod = current.id % 3;
                    var mod_sum = current_mod + current.next.id % 3;
                    if (mod_sum == 2) {
                        current = current.next.next;
                        previous.next = current;
                    } else {
                        current.id += ((mod_sum + 1) % 4) - current_mod;
                        current.next = current.next.next;
                    }
                } else if (current.id / 6 >> 0 == current.next.id / 6 >> 0
                    && current.next.next !== null
                    && current.id / 3 >> 0 == current.next.next.id / 3 >> 0) {
                    size = 0;
                    var current_mod = current.id % 3;
                    var mod_sum = current_mod + current.next.next.id % 3;
                    if (mod_sum == 2) {
                        current.id = current.next.id;
                        current.next = current.next.next.next;
                    } else {
                        current.id += ((mod_sum + 1) % 4) - current_mod;
                        current.next = { id: current.next.id,
                            next: current.next.next.next };
                    }
                } else {
                    if (size) {
                        size++;
                    }
                    previous = current;
                    current = current.next;
                }
            }
            previous = this.start;
            current = previous.next;
        }
        this.start = this.start.next;
        return this.start === null ? 0 : (size_weight * size);
    }

    this.cube_string = function() {
        var cube_left = [this.left[0], this.left[1], this.left[2], this.left[7],
            1, this.left[3], this.left[6], this.left[5], this.left[4]];
        var cube_right = [this.right[0], this.right[1], this.right[2], this.right[7],
            2, this.right[3], this.right[6], this.right[5], this.right[4]];
        var cube_front = [this.front[0], this.front[1], this.front[2], this.front[7],
            3, this.front[3], this.front[6], this.front[5], this.front[4]];
        var cube_back = [this.back[0], this.back[1], this.back[2], this.back[7],
            4, this.back[3], this.back[6], this.back[5], this.back[4]];
        var cube_up = [this.up[0], this.up[1], this.up[2], this.up[7],
            5, this.up[3], this.up[6], this.up[5], this.up[4]];
        var cube_down = [this.down[0], this.down[1], this.down[2], this.down[7],
            6, this.down[3], this.down[6], this.down[5], this.down[4]];
        var side = " side:</td><td></td><td>";
        return "<table><tr><td>Left" + side + cube_left.join("</td><td>")
            + "</td></tr><tr><td>Right"  + side + cube_right.join("</td><td>")
            + "</td></tr><tr><td>Front"  + side + cube_front.join("</td><td>")
            + "</td></tr><tr><td>Back"   + side + cube_back.join("</td><td>")
            + "</td></tr><tr><td>Up"    + side + cube_up.join("</td><td>")
            + "</td></tr><tr><td>Down" + side + cube_down.join("</td><td>")
            + "</td></tr></table>";
    }

    this.history_string = function() {
        var moves = new Array(this.size() / size_weight);
        var ptr = this.start;
        for (var i = moves.length; i-- && ptr !== null; ptr = ptr.next) {
            moves[i] = move_strs[ptr.id];
        }
        return [moves.length, moves.join(" ")];
    }

    this.l = function() {
        var down6 = this.down[6]; var down7 = this.down[7];
        var down0 = this.down[0];
        var left7 = this.left[7]; var left6 = this.left[6];
        this.left[7] = this.left[5]; this.left[6] = this.left[4];
        this.left[5] = this.left[3]; this.left[4] = this.left[2];
        this.left[3] = this.left[1]; this.left[2] = this.left[0];
        this.left[1] = left7; this.left[0] = left6;
        this.down[0] = this.front[0]; this.down[6] = this.front[6];
        this.down[7] = this.front[7]; this.front[0] = this.up[0];
        this.front[6] = this.up[6]; this.front[7] = this.up[7];
        this.up[0] = this.back[4]; this.up[6] = this.back[2];
        this.up[7] = this.back[3]; this.back[2] = down6;
        this.back[3] = down7; this.back[4] = down0;
    }

    this.r = function() {
        var back6 = this.back[6]; var back7 = this.back[7];
        var back0 = this.back[0];
        var right7 = this.right[7]; var right6 = this.right[6];
        this.right[7] = this.right[5]; this.right[6] = this.right[4];
        this.right[5] = this.right[3]; this.right[4] = this.right[2];
        this.right[3] = this.right[1]; this.right[2] = this.right[0];
        this.right[1] = right7; this.right[0] = right6;
        this.back[0] = this.up[4]; this.back[6] = this.up[2];
        this.back[7] = this.up[3]; this.up[2] = this.front[2];
        this.up[3] = this.front[3]; this.up[4] = this.front[4];
        this.front[2] = this.down[2]; this.front[3] = this.down[3];
        this.front[4] = this.down[4]; this.down[2] = back6;
        this.down[3] = back7; this.down[4] = back0;
    }

    this.f = function() {
        var right6 = this.right[6]; var right7 = this.right[7];
        var right0 = this.right[0];
        var front7 = this.front[7]; var front6 = this.front[6];
        this.front[7] = this.front[5]; this.front[6] = this.front[4];
        this.front[5] = this.front[3]; this.front[4] = this.front[2];
        this.front[3] = this.front[1]; this.front[2] = this.front[0];
        this.front[1] = front7; this.front[0] = front6;
        this.right[0] = this.up[6]; this.right[6] = this.up[4];
        this.right[7] = this.up[5]; this.up[4] = this.left[2];
        this.up[5] = this.left[3]; this.up[6] = this.left[4];
        this.left[2] = this.down[0]; this.left[3] = this.down[1];
        this.left[4] = this.down[2]; this.down[0] = right6;
        this.down[1] = right7; this.down[2] = right0;
    }

    this.b = function() {
        var left6 = this.left[6]; var left7 = this.left[7];
        var left0 = this.left[0];
        var back7 = this.back[7]; var back6 = this.back[6];
        this.back[7] = this.back[5]; this.back[6] = this.back[4];
        this.back[5] = this.back[3]; this.back[4] = this.back[2];
        this.back[3] = this.back[1]; this.back[2] = this.back[0];
        this.back[1] = back7; this.back[0] = back6;
        this.left[0] = this.up[2]; this.left[6] = this.up[0];
        this.left[7] = this.up[1]; this.up[0] = this.right[2];
        this.up[1] = this.right[3]; this.up[2] = this.right[4];
        this.right[2] = this.down[4]; this.right[3] = this.down[5];
        this.right[4] = this.down[6]; this.down[4] = left6;
        this.down[5] = left7; this.down[6] = left0;
    }

    this.u = function() {
        var left0 = this.left[0]; var left1 = this.left[1];
        var left2 = this.left[2];
        var up7 = this.up[7]; var up6 = this.up[6];
        this.up[7] = this.up[5]; this.up[6] = this.up[4];
        this.up[5] = this.up[3]; this.up[4] = this.up[2];
        this.up[3] = this.up[1]; this.up[2] = this.up[0];
        this.up[1] = up7; this.up[0] = up6;
        this.left[0] = this.front[0]; this.left[1] = this.front[1];
        this.left[2] = this.front[2]; this.front[0] = this.right[0];
        this.front[1] = this.right[1]; this.front[2] = this.right[2];
        this.right[0] = this.back[0]; this.right[1] = this.back[1];
        this.right[2] = this.back[2]; this.back[0] = left0;
        this.back[1] = left1; this.back[2] = left2;
    }

    this.d = function() {
        var left4 = this.left[4]; var left5 = this.left[5];
        var left6 = this.left[6];
        var down7 = this.down[7]; var down6 = this.down[6];
        this.down[7] = this.down[5]; this.down[6] = this.down[4];
        this.down[5] = this.down[3]; this.down[4] = this.down[2];
        this.down[3] = this.down[1]; this.down[2] = this.down[0];
        this.down[1] = down7; this.down[0] = down6;
        this.left[4] = this.back[4]; this.left[5] = this.back[5];
        this.left[6] = this.back[6]; this.back[4] = this.right[4];
        this.back[5] = this.right[5]; this.back[6] = this.right[6];
        this.right[4] = this.front[4]; this.right[5] = this.front[5];
        this.right[6] = this.front[6]; this.front[4] = left4;
        this.front[5] = left5; this.front[6] = left6;
    }

    this.move = function(id) {
        switch(id) {
            case 0:
                this.l(); break;
            case 1:
                this.l(); this.l(); break;
            case 2:
                this.l(); this.l(); this.l(); break;
            case 3:
                this.r(); break;
            case 4:
                this.r(); this.r(); break;
            case 5:
                this.r(); this.r(); this.r(); break;
            case 6:
                this.f(); break;
            case 7:
                this.f(); this.f(); break;
            case 8:
                this.f(); this.f(); this.f(); break;
            case 9:
                this.b(); break;
            case 10:
                this.b(); this.b(); break;
            case 11:
                this.b(); this.b(); this.b(); break;
            case 12:
                this.u(); break;
            case 13:
                this.u(); this.u(); break;
            case 14:
                this.u(); this.u(); this.u(); break;
            case 15:
                this.d(); break;
            case 16:
                this.d(); this.d(); break;
            default:
                this.d(); this.d(); this.d();
        }
        this.start = { id: id, next: this.start }; // insert move into history
    }

    this.randomize = function() {
        this.start = null;
        this.left    = [1, 1, 1, 1, 1, 1, 1, 1];
        this.right   = [2, 2, 2, 2, 2, 2, 2, 2];
        this.front   = [3, 3, 3, 3, 3, 3, 3, 3];
        this.back    = [4, 4, 4, 4, 4, 4, 4, 4];
        this.up     = [5, 5, 5, 5, 5, 5, 5, 5];
        this.down  = [6, 6, 6, 6, 6, 6, 6, 6];
        for (var i = 40; i--;) {
            this.move(Math.random() * 18 >> 0);
        }
        var moves_made = this.history_string();
        this.start = null; this.fitness = 0; this.fitness_without_size = 0;
        return moves_made;
    }

    this.edge_flipped_correctly = function(facelet1, facelet2) {
        return facelet1 < 5 && facelet2 != 3 && facelet2 != 4;
    }

    this.num_misflipped_edges = function() {
        var edg = [this.front[1], this.up[5], this.back[1], this.up[1],
                   this.front[3], this.right[7], this.back[3], this.left[7],
                   this.front[5], this.down[1], this.back[5], this.down[5],
                   this.front[7], this.left[3], this.back[7], this.right[3],
                   this.left[1], this.up[7], this.right[1], this.up[3],
                   this.left[5], this.down[7], this.right[5], this.down[3]];
        var num = 0;
        for (var i = 12; i--;) {
            if (!this.edge_flipped_correctly(edg[i * 2], edg[i * 2 + 1])) {
                num++;
            }
        }
        return num;
    }

    this.phase0_fitness = function() {
        this.fitness_without_size = g0_weight * this.num_misflipped_edges();
    }

    this.num_misplaced_mid_edges = function() {
        var edg = [this.up[1], this.down[1], this.up[3], this.down[3],
                   this.up[5], this.down[5], this.up[7], this.down[7]];
        var num = 0;
        for (var i = 8; i--;) {
            if (edg[i] < 5) {
                num++;
            }
        }
        return num;
    }

    this.phase1_fitness = function() {
        this.fitness_without_size = g1a_weight * this.num_misplaced_mid_edges();
    }

    this.num_misoriented_corners = function() {
        var cor = [this.up[0], this.down[0], this.up[2], this.down[2],
                   this.up[4], this.down[4], this.up[6], this.down[6]];
        var num = 0;
        for (var i = 8; i--;) {
            if (cor[i] < 5) {
                num++;
            }
        }
        return num;
    }

    this.phase2_fitness = function() {
        this.fitness_without_size = g1a_weight * this.num_misplaced_mid_edges()
            + g1b_weight * this.num_misoriented_corners();
    }

    this.num_unopposite_facelets = function() {
        var num = 0;
        for (var i = 8; i--;) {
            if (this.left[i] > 2) {
                num++;
            }
            if (this.right[i] > 2) {
                num++;
            }
            if (this.front[i] != 3 && this.front[i] != 4) {
                num++;
            }
            if (this.back[i] != 3 && this.back[i] != 4) {
                num++;
            }
            if (this.up[i] < 5) {
                num++;
            }
            if (this.down[i] < 5) {
                num++;
            }
        }
        return num;
    }

    this.phase3_fitness = function() {
        this.fitness_without_size = g2_weight * this.num_unopposite_facelets();
    }

    this.uniform_up = function(side) {
        return side[0] == side[1] && side[1] == side[2];
    }

    this.uniform_down = function(side) {
        return side[4] == side[5] && side[5] == side[6];
    }

    this.num_unfulfilled_g3_req = function() {
        var num = 0;
        var req = [this.front[3] == 3,  this.front[7] == 3, // tests back
                   this.up[3] == 5,    this.up[7] == 5];
        for (var i = 4; i--;) {
            if (!req[i]) {
                num++;
            }
        }
        var rq2 = [this.uniform_up(this.front),  this.uniform_down(this.front),
                   this.uniform_up(this.back),   this.uniform_down(this.back),
                   this.uniform_up(this.up),    this.uniform_down(this.up),
                   this.uniform_up(this.down), this.uniform_down(this.down)];
        for (var i = 8; i--;) {
            if (!rq2[i]) {
                num += g3_criteria_weight;
            }
        }
        return num;
    }

    this.phase4_fitness = function() {
        this.fitness_without_size = g3_weight * this.num_unfulfilled_g3_req();
    }

    this.num_unfulfilled_g4_req = function() {
        var num = 0;
        for (var i = 8; i--;) {
            if (this.up[i] != 5) {
                num++;
            }
            if (this.down[i] != 6) {
                num++;
            }
        }
        var req = [this.left[3] == 1,  this.left[7] == 1,
                   this.uniform_up(this.left),  this.uniform_down(this.left),
                   this.uniform_up(this.right), this.uniform_down(this.right)];
        for (var i = 6; i--;) {
            if (!req[i]) {
                num += g4_criteria_weight;
            }
        }
        return num;
    }

    this.phase5_fitness = function() {
        this.fitness_without_size = g4_weight * this.num_unfulfilled_g4_req();
    }

    this.num_miscolored_facelets = function() {
        var num = 0;
        for (var i = 8; i--;) {
            if (this.left[i] != 1) {
                num++;
            }
            if (this.right[i] != 2) {
                num++;
            }
            if (this.front[i] != 3) {
                num++;
            }
            if (this.back[i] != 4) {
                num++;
            }
            if (this.up[i] != 5) {
                num++;
            }
            if (this.down[i] != 6) {
                num++;
            }
        }
        return num;
    }

    this.phase6_fitness = function() {
        this.fitness_without_size = g5_weight * this.num_miscolored_facelets();
    }

    this.mutate = function(phse) {
        var moves = movegroup_of_phase[phse].length;
        for (var i = Math.random() * max_moves[phse] >> 0; i--;) {
            this.move(movegroup_of_phase[phse][Math.random() * moves >> 0]);
        }
        switch(phse) {
            case 0:
                this.phase0_fitness(); break;
            case 1:
                this.phase1_fitness(); break;
            case 2:
                this.phase2_fitness(); break;
            case 3:
                this.phase3_fitness(); break;
            case 4:
                this.phase4_fitness(); break;
            case 5:
                this.phase5_fitness(); break;
            default:
                this.phase6_fitness();
        }
        this.fitness = this.fitness_without_size + this.size();
    }
}

function reset_population(population, cube) {
    for (var i = population.length; i--;) {
        population[i].copy(cube);
    }
}

function compare_cubes(cube1, cube2) {
    return cube1.fitness - cube2.fitness;
}

function next_generation(population) {
    var entire_pool_solves_current_phase = true;
    population.sort(compare_cubes);
    for (var i = num_survivors; i--;) {
        population[i + num_survivors].copy(population[i]);
        if (population[i].fitness_without_size) {
            entire_pool_solves_current_phase = false;
        }
    }
    for (var i = 2 * num_survivors, m = num_survivors - 1; i < pop_size; i++) {
        population[i].copy(population[select()]);
    }
    return entire_pool_solves_current_phase;
}

var solved_cube = null;
function execute_current_generation(population, current_phase) {
    var go_to_next_phase = true;
    var min_sol_length = 1000000;
    var solved_id = -1;
    if (current_phase == movegroup_of_phase.length - 1) {
        for (var i = pop_size; i--;) {
            population[i].mutate(current_phase);
            if (population[i].fitness < min_sol_length && !population[i].fitness_without_size) {
                solved_id = i;
                min_sol_length = population[i].fitness;
            }
        }
    } else {
        for (var i = pop_size; i--;) {
            population[i].mutate(current_phase);
        }
    }
    if (solved_id >= 0) {
        solved_cube = population[solved_id];
    } else {
        go_to_next_phase = next_generation(population);
    }
    return go_to_next_phase;
}

function now() {
    return new Date().getTime();
}

var start_time, gen_count, phase, phase4_gens;
var user_cube = new Cube(); var user_population = new Array(pop_size);
for (var i = pop_size; i--;) {
    user_population[i] = new Cube();
}

function set(user_wants_random_cube) {
    document.getElementById("diagram").innerHTML =
        '<table>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">U1</td><td class="bor">U2</td><td class="bor">U3</td></tr>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">U4</td><td class="bor">U5</td><td class="bor">U6</td></tr>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">U7</td><td class="bor">U8</td><td class="bor">U9</td></tr>'
        + '<tr></tr><tr></tr><tr></tr><tr></tr>'
        + '<tr>'
          + '<td class="bor">L1</td><td class="bor">L2</td><td class="bor">L3</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">F1</td><td class="bor">F2</td><td class="bor">F3</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">R1</td><td class="bor">R2</td><td class="bor">R3</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">B1</td><td class="bor">B2</td><td class="bor">B3</td>'
        + '</tr>'
        + '<tr>'
          + '<td class="bor">L4</td><td class="bor">L5</td><td class="bor">L6</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">F4</td><td class="bor">F5</td><td class="bor">F6</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">R4</td><td class="bor">R5</td><td class="bor">R6</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">B4</td><td class="bor">B5</td><td class="bor">B6</td>'
        + '</tr>'
        + '<tr>'
          + '<td class="bor">L7</td><td class="bor">L8</td><td class="bor">L9</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">F7</td><td class="bor">F8</td><td class="bor">F9</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">R7</td><td class="bor">R8</td><td class="bor">R9</td><td></td><td></td><td></td><td></td>'
          + '<td class="bor">B7</td><td class="bor">B8</td><td class="bor">B9</td>'
        + '</tr>'
        + '<tr></tr><tr></tr><tr></tr><tr></tr>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">D1</td><td class="bor">D2</td><td class="bor">D3</td></tr>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">D4</td><td class="bor">D5</td><td class="bor">D6</td></tr>'
        + '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
        + '<td class="bor">D7</td><td class="bor">D8</td><td class="bor">D9</td></tr>'
      + '</table>';
    if (user_wants_random_cube) {
        var moves = user_cube.randomize();
        var str = user_cube.cube_string();
        document.getElementById("demo").innerHTML =
            "Click again to rescramble.<br>Your random cube is:<br><br>" + str
            + "<br>" + moves[0] + " random moves were made:<br>" + moves[1]
            + "<br><br>1 is the color of"
            + " the left side, 2 is the color of the right side, etc.<br>A"
            + " side's color is determined by its center tile, which cannot"
            + " move.<br><br>The numbers are in the pattern of the above"
            + " diagram. The algorithm will restart if it reaches a local"
            + " minimum.";
    } else {
        document.getElementById("demo").innerHTML = "1 is the color of the left"
            + " side, 2 is the color of the right side, etc.<br>A side's color"
            + " is determined by its center tile, which cannot move."
            + "<br><br>Input your cube using the diagram above. For each side"
            + " enter nine digits between 1 through 6 representing the color of"
            + " each cube.<br><br>"
            + '<table><tr><td>Left:</td><td><input type="text" name="l"></td></tr>'
            + '<tr><td>Right:</td><td><input type="text" name="r"></td></tr>'
            + '<tr><td>Front:</td><td><input type="text" name="f"></td></tr>'
            + '<tr><td>Back:</td><td><input type="text" name="b"></td></tr>'
            + '<tr><td>Top:</td><td><input type="text" name="u"></td></tr>'
            + '<tr><td>Down:</td><td><input type="text" name="d"></td></tr></table>';
        user_cube.left = [6, 2, 2, 3, 3, 4, 3, 5];
        user_cube.right = [3, 5, 4, 1, 2, 2, 1, 6];
        user_cube.front = [6, 2, 6, 3, 3, 6, 2, 1];
        user_cube.back = [1, 4, 4, 1, 2, 2, 5, 6];
        user_cube.up = [1, 5, 5, 3, 1, 3, 4, 6];
        user_cube.down = [6, 4, 5, 5, 4, 4, 5, 1];
    }
    reset_population(user_population, user_cube);
    document.getElementById("solving").innerHTML = "";
    document.getElementById("bton").innerHTML =
        '<input type="button" onclick="solve(false)" value="Solve"/>';
}

function solve() {
    gen_count = 0; phase = 0; start_time = now(); execute();
}

function solution_string() {
    var history = solved_cube.history_string();
    return "A solution was found in " + gen_count + " generations!<br><br>It"
        + " took " + ((now() - start_time)/1000).toFixed(1) + " seconds and"
        + " contains " + history[0] + " moves:<br>" + history[1]
        + "<br><br>Thanks for using Rubix!<br>";
}

function execute() {
    solved_cube = null;
    while (phase < movegroup_of_phase.length) {
        gen_count++;
        if (execute_current_generation(user_population, phase)) {
            phase++;
            phase4_gens = 0;
        } else if (phase == 4 && ++phase4_gens >= max_phase4_generations) {
            reset_population(user_population, user_cube);
            phase = 0;
        }
    }
    document.getElementById("solving").innerHTML = solution_string();
}
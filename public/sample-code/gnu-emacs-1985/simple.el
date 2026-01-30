;; simple.el -- basic editing commands for Emacs

;; Copyright (C) 1985 Richard M. Stallman.

;; This file is part of GNU Emacs.

;; GNU Emacs is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY.  No author or distributor
;; accepts responsibility to anyone for the consequences of using it
;; or for whether it serves any particular purpose or works at all,
;; unless he says so in writing.  Refer to the GNU Emacs General Public
;; License for full details.

;; Everyone is granted permission to copy, modify and redistribute
;; GNU Emacs, but only under the conditions described in the
;; GNU Emacs General Public License.   A copy of this license is
;; supposed to have been given to you along with GNU Emacs so you
;; can know your rights and responsibilities.  It should be in a
;; file named COPYING.  Among other things, the copyright notice
;; and this notice must be preserved on all copies.


(defun beginning-of-line (&optional n)
  "Move point to beginning of current line.
With argument N not nil or 1, move forward N - 1 lines first.
If scan reaches end of buffer, stop there without error."
  (interactive "p")
  (if (or (null n) (= n 1))
      (forward-line 0)
    (forward-line (1- n))))

(defun end-of-line (&optional n)
  "Move point to end of current line.
With argument N not nil or 1, move forward N - 1 lines first.
If scan reaches end of buffer, stop there without error."
  (interactive "p")
  (if (or (null n) (= n 1))
      (end-of-line 1)
    (forward-line (1- n))
    (end-of-line 1)))

(defun delete-horizontal-space ()
  "Delete all spaces and tabs around point."
  (interactive "*")
  (skip-chars-backward " \t")
  (delete-region (point) (progn (skip-chars-forward " \t") (point))))

(defun just-one-space ()
  "Delete all spaces and tabs around point, leaving one space."
  (interactive "*")
  (skip-chars-backward " \t")
  (if (not (bolp))
      (progn
        (delete-region (point) (progn (skip-chars-forward " \t") (point)))
        (insert ? ))))

(defun delete-blank-lines ()
  "On blank line, delete all surrounding blank lines, leaving just one.
On isolated blank line, delete that one.
On nonblank line, delete all blank lines that follow it."
  (interactive "*")
  (let (thisblank singleblank)
    (save-excursion
      (beginning-of-line)
      (setq thisblank (looking-at "[ \t]*$"))
      ;; Set singleblank if there is just one blank line here.
      (setq singleblank
            (and thisblank
                 (not (looking-at "[ \t]*\n[ \t]*$"))
                 (or (bobp)
                     (progn (forward-line -1)
                            (not (looking-at "[ \t]*$")))))))
    ;; Delete preceding blank lines, and this one too if it's the only one.
    (if thisblank
        (progn
          (beginning-of-line)
          (if singleblank (forward-line 1))
          (delete-region (point)
                         (if (re-search-backward "[^ \t\n]" nil t)
                             (progn (forward-line 1) (point))
                           (point-min)))))
    ;; Delete following blank lines, unless the current line is blank
    ;; and there are no following blank lines.
    (if (not (and thisblank singleblank))
        (save-excursion
          (end-of-line)
          (forward-line 1)
          (delete-region (point)
                         (if (re-search-forward "[^ \t\n]" nil t)
                             (progn (beginning-of-line) (point))
                           (point-max)))))
    ;; Handle the special case where point is followed by newline and eob.
    ;; Delete the line, leaving point at eob.
    (if (looking-at "^[ \t]*\n\\'")
        (delete-region (point) (point-max)))))

(defun back-to-indentation ()
  "Move point to first visible character on line."
  (interactive)
  (beginning-of-line)
  (skip-chars-forward " \t"))

(defun newline (&optional arg)
  "Insert a newline.  With arg, insert that many newlines.
In Auto Fill mode, can break the preceding line if no numeric arg.
This is the usual command to end a line."
  (interactive "*P")
  (if (auto-fill-hook)
      (progn
        (funcall auto-fill-function)
        (if (and (interactive-p) (eolp))
            (if arg
                (self-insert-command (prefix-numeric-value arg))
              (self-insert-command 1))))
    ;; Do the work of a self-insert-command.
    (if arg (setq arg (prefix-numeric-value arg))
      (setq arg 1))
    (if (and (> arg 0)
             (eq (char-syntax (preceding-char)) ?w))
        (insert-char ?  1))
    (newline arg)))

(defun open-line (arg)
  "Insert a newline and leave point before it.
With arg, inserts that many newlines."
  (interactive "*p")
  (let ((flag (and (bolp) (not (bobp)))))
    (if flag (forward-char -1))
    (save-excursion
     (while (> arg 0)
       (insert ?\n)
       (setq arg (1- arg))))
    (if flag (forward-char 1))))

(defun split-line ()
  "Split current line, moving portion beyond point vertically down."
  (interactive "*")
  (skip-chars-forward " \t")
  (let ((col (current-column))
        (pos (point)))
    (insert ?\n)
    (indent-to col 0)
    (goto-char pos)))

(defun quoted-insert (arg)
  "Read next input character and insert it.
Useful for inserting control characters.
You may also type up to 3 octal digits, to insert a character with that code."
  (interactive "*p")
  (let ((char (read-quoted-char)))
    (while (> arg 0)
      (insert char)
      (setq arg (1- arg)))))

(defun transpose-chars (arg)
  "Interchange characters around point, moving forward one character.
With prefix arg ARG, effect is to take character before point
and drag it forward past ARG other characters (backward if ARG negative).
If no argument and at end of line, the previous two chars are exchanged."
  (interactive "*P")
  (and (null arg) (eolp) (forward-char -1))
  (transpose-subr 'forward-char (prefix-numeric-value arg)))

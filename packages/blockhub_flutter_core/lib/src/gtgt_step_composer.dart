import 'package:flutter/material.dart';

/// 与 Web `GtgtStepComposer` / 首页预约演示同构：单字段 `>>` + 确认推进。
class GtgtStep {
  const GtgtStep({
    required this.key,
    required this.label,
    this.placeholder,
    this.optional = false,
    this.multiline = false,
    this.keyboardType,
    this.choices,
  });

  final String key;
  final String label;
  final String? placeholder;
  final bool optional;
  final bool multiline;
  final TextInputType? keyboardType;
  /// 非空则渲染 ChoiceChip，不显示文本框
  final List<({String value, String label})>? choices;
}

class GtgtStepComposer extends StatefulWidget {
  const GtgtStepComposer({
    super.key,
    required this.title,
    required this.steps,
    required this.values,
    required this.onChanged,
    required this.onComplete,
    this.flowHint,
    this.busy = false,
    this.submitLabel = '提交',
    this.accent,
    this.resetKey = 0,
  });

  final String title;
  final String? flowHint;
  final List<GtgtStep> steps;
  final Map<String, String> values;
  final void Function(String key, String value) onChanged;
  final Future<void> Function() onComplete;
  final bool busy;
  final String submitLabel;
  final Color? accent;
  final int resetKey;

  @override
  State<GtgtStepComposer> createState() => _GtgtStepComposerState();
}

class _GtgtStepComposerState extends State<GtgtStepComposer> {
  int _step = 0;
  late final TextEditingController _ctrl;
  final _focus = FocusNode();

  GtgtStep get _current => widget.steps[_step];
  bool get _isLast => _step >= widget.steps.length - 1;

  String get _draft {
    if (widget.values.containsKey(_current.key)) {
      return widget.values[_current.key] ?? '';
    }
    return _ctrl.text;
  }

  bool get _canGo {
    if (_current.optional) return true;
    if (_current.choices != null) return _draft.trim().isNotEmpty;
    return _draft.trim().isNotEmpty;
  }

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.values[_current.key] ?? '');
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
  }

  @override
  void didUpdateWidget(covariant GtgtStepComposer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.resetKey != widget.resetKey) {
      setState(() {
        _step = 0;
        _syncCtrl();
      });
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _syncCtrl() {
    final v = widget.values[_current.key] ?? '';
    if (_ctrl.text != v) {
      _ctrl.text = v;
      _ctrl.selection = TextSelection.collapsed(offset: v.length);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  Future<void> _advance() async {
    if (widget.busy || !_canGo) return;
    if (_current.choices == null) {
      widget.onChanged(_current.key, _ctrl.text.trim());
    }
    if (_isLast) {
      await widget.onComplete();
      return;
    }
    setState(() {
      _step += 1;
      _syncCtrl();
    });
  }

  void _back() {
    if (_step == 0 || widget.busy) return;
    setState(() {
      _step -= 1;
      _syncCtrl();
    });
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.accent ?? Theme.of(context).colorScheme.primary;
    final draft = widget.values[_current.key] ?? _ctrl.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Text(widget.title, style: Theme.of(context).textTheme.titleLarge)),
            Text('${_step + 1}/${widget.steps.length}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ],
        ),
        if (widget.flowHint != null) ...[
          const SizedBox(height: 4),
          Text(widget.flowHint!, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 6,
          children: [
            for (var i = 0; i < widget.steps.length; i++)
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == _step ? color : (i < _step ? Colors.blueGrey.shade300 : Colors.grey.shade300),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Text('>> ${_current.label}', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (_current.choices != null)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in _current.choices!)
                ChoiceChip(
                  label: Text(c.label),
                  selected: draft == c.value,
                  selectedColor: color.withOpacity(0.2),
                  onSelected: (_) {
                    widget.onChanged(_current.key, c.value);
                    setState(() {});
                  },
                ),
            ],
          )
        else
          TextField(
            controller: _ctrl,
            focusNode: _focus,
            maxLines: _current.multiline ? 3 : 1,
            keyboardType: _current.keyboardType,
            decoration: InputDecoration(
              border: const OutlineInputBorder(),
              hintText: _current.placeholder ?? '填写${_current.label}',
            ),
            onChanged: (v) {
              widget.onChanged(_current.key, v);
              setState(() {});
            },
            onSubmitted: (_) => _advance(),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            if (_step > 0) TextButton(onPressed: widget.busy ? null : _back, child: const Text('上一步')),
            if (_current.optional && !_isLast)
              TextButton(
                onPressed: widget.busy
                    ? null
                    : () {
                        widget.onChanged(_current.key, _ctrl.text.trim());
                        setState(() {
                          _step += 1;
                          _syncCtrl();
                        });
                      },
                child: const Text('跳过'),
              ),
            const Spacer(),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: color),
              onPressed: widget.busy || !_canGo ? null : _advance,
              child: Text(widget.busy && _isLast ? '提交中…' : (_isLast ? widget.submitLabel : '确认')),
            ),
          ],
        ),
      ],
    );
  }
}

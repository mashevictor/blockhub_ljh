import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../config/app_branding.dart';
import '../services/auth_service.dart';

class ReportPage extends StatefulWidget {
  const ReportPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends State<ReportPage> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = authService.authedDio();
      final resp = await dio.get<Map<String, dynamic>>('${widget.branding.apiBaseUrl}/reports/dashboard');
      _data = resp.data;
    } catch (e) {
      _error = '加载失败: $e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Color(widget.branding.primaryColorValue);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    if (_data == null) return const Center(child: Text('暂无数据'));

    final kpis = (_data!['kpis'] as List<dynamic>? ?? []);
    final approvalTrend = _data!['approval_trend'] as Map<String, dynamic>? ?? {};
    final chatTrend = _data!['chat_trend'] as Map<String, dynamic>? ?? {};
    final agentUsage = (_data!['agent_usage'] as List<dynamic>? ?? []);

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: kpis.map<Widget>((k) {
            final m = k as Map<String, dynamic>;
            return Card(
              child: Container(
                width: 150,
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['value']?.toString() ?? '', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: primary)),
                    const SizedBox(height: 4),
                    Text(m['label']?.toString() ?? '', style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        _TrendCard(title: '审批趋势', trend: approvalTrend, color: primary),
        const SizedBox(height: 12),
        _TrendCard(title: '问答趋势', trend: chatTrend, color: Colors.teal),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('各能力使用占比', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ...agentUsage.map<Widget>((a) {
                  final m = a as Map<String, dynamic>;
                  final percent = (m['percent'] as num? ?? 0).toDouble();
                  final calls = (m['calls'] as num? ?? 0).toInt();
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${m['agent']} · $calls ($percent%)'),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(value: percent / 100, minHeight: 8),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _TrendCard extends StatelessWidget {
  const _TrendCard({required this.title, required this.trend, required this.color});

  final String title;
  final Map<String, dynamic> trend;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final months = (trend['months'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
    final values = (trend['values'] as List<dynamic>? ?? []).map((e) => (e as num).toDouble()).toList();
    if (values.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: 160,
              child: BarChart(
                BarChartData(
                  barGroups: [
                    for (var i = 0; i < values.length; i++)
                      BarChartGroupData(
                        x: i,
                        barRods: [BarChartRodData(toY: values[i], color: color, width: 14, borderRadius: BorderRadius.circular(4))],
                      ),
                  ],
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) => Text(months.isNotEmpty && v.toInt() < months.length ? months[v.toInt()] : ''),
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

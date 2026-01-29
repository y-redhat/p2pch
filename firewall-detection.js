// ファイアウォール検出のための追加機能
class FirewallDetector {
    static async detectFirewall(hostname) {
        const tests = [
            this.testWAFHeaders,
            this.testPortBlocking,
            this.testRateLimiting
        ];
        
        const results = [];
        for (const test of tests) {
            try {
                const result = await test(hostname);
                if (result) results.push(result);
            } catch (e) {
                // テスト失敗は無視
            }
        }
        
        return results;
    }
    
    static async testWAFHeaders(hostname) {
        try {
            const response = await fetch(`https://${hostname}`, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            // WAFを示すヘッダーのチェック
            const wafHeaders = [
                'x-waf',
                'cf-ray',
                'x-protected-by',
                'x-firewall'
            ];
            
            // 実際のヘッダー確認はCORS制限のため困難
            // プロキシ経由など別の方法が必要
            
            return null;
        } catch (e) {
            return null;
        }
    }
    
    static async testPortBlocking(hostname) {
        const commonFirewallPorts = [80, 443, 22, 21, 25, 53];
        const openPorts = [];
        
        // 注意: ブラウザからのポートスキャンは制限が多い
        // 実際の実装にはサーバーサイドコンポーネントが必要
        
        return null;
    }
}

// サービス識別データベースの拡張
const additionalServices = {
    // ファイアウォール/プロキシ
    'cloudflare.com': { name: 'Cloudflare WAF', type: 'firewall', icon: '🛡️' },
    'imperva.com': { name: 'Imperva WAF', type: 'firewall', icon: '🛡️' },
    'aws/shield': { name: 'AWS Shield', type: 'firewall', icon: '🛡️' },
    
    // ロードバランサー
    'elb.amazonaws.com': { name: 'AWS ELB', type: 'loadbalancer', icon: '⚖️' },
    
    // 監視サービス
    'newrelic.com': { name: 'New Relic', type: 'monitoring', icon: '📈' },
    'datadoghq.com': { name: 'Datadog', type: 'monitoring', icon: '📈' },
    
    // 決済サービス
    'stripe.com': { name: 'Stripe', type: 'payment', icon: '💳' },
    'paypal.com': { name: 'PayPal', type: 'payment', icon: '💳' },
    
    // メールサービス
    'smtp.': { name: 'SMTP Server', type: 'email', icon: '📧' },
    'mail.': { name: 'Mail Server', type: 'email', icon: '📧' }
};
